import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { getBillingProvider, plansFor } from "@/lib/billing";
import { PaddleProvider } from "@/lib/billing/paddle";
import { MemoryBillingStore, usageMonth } from "@/lib/billing/store";
import { IDENTITY_COOKIE, identify } from "@/lib/identity";
import { entitlementFor, hasPacksLeft, recordPack } from "@/lib/tier";

const SECRET = "pdl_ntfset_test";
const NOW = Date.parse("2026-11-22T12:00:00Z");
const env = { PADDLE_PRICE_PRO_MONTHLY: "pri_monthly", SESSION_SECRET: "s3cret", FREE_PACKS_PER_MONTH: "2" };

function signed(body: string, ts = Math.floor(NOW / 1000), secret = SECRET) {
  const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return new Headers({ "paddle-signature": `ts=${ts};h1=${h1}` });
}

function paddle(fetchImpl?: typeof fetch) {
  return new PaddleProvider({ apiKey: "k", environment: "sandbox", webhookSecret: SECRET, now: () => NOW, fetch: fetchImpl });
}

const subscriptionEvent = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    event_id: "evt_1",
    event_type: "subscription.activated",
    occurred_at: "2026-11-22T11:59:00Z",
    data: {
      id: "sub_1",
      status: "active",
      customer_id: "ctm_1",
      custom_data: { user_ref: "user-1" },
      items: [{ price: { id: "pri_monthly" } }],
      current_billing_period: { ends_at: "2026-12-22T11:59:00Z" },
      ...overrides,
    },
  });

describe("paddle webhooks", () => {
  it("accepts a correctly signed subscription event", async () => {
    vi.stubEnv("PADDLE_PRICE_PRO_MONTHLY", "pri_monthly");
    const body = subscriptionEvent();
    const event = await paddle().parseWebhook(body, signed(body));
    expect(event?.subscription).toMatchObject({ userRef: "user-1", status: "active", planId: "pro_monthly", customerId: "ctm_1" });
    vi.unstubAllEnvs();
  });

  it("rejects a bad signature, a tampered body and an old timestamp", async () => {
    const body = subscriptionEvent();
    await expect(paddle().parseWebhook(body, signed(body, undefined, "wrong"))).rejects.toMatchObject({ kind: "invalid_signature" });
    await expect(paddle().parseWebhook(body.replace("active", "trialing"), signed(body))).rejects.toMatchObject({
      kind: "invalid_signature",
    });
    const old = Math.floor(NOW / 1000) - 3600;
    await expect(paddle().parseWebhook(body, signed(body, old))).rejects.toMatchObject({ kind: "invalid_signature" });
    await expect(paddle().parseWebhook(body, new Headers())).rejects.toMatchObject({ kind: "invalid_signature" });
  });

  it("ignores non-subscription events and events without our user id", async () => {
    const txn = JSON.stringify({ event_type: "transaction.completed", data: {} });
    expect(await paddle().parseWebhook(txn, signed(txn))).toBeNull();
    const orphan = subscriptionEvent({ custom_data: null });
    expect(await paddle().parseWebhook(orphan, signed(orphan))).toBeNull();
  });
});

describe("paddle checkout", () => {
  it("creates a transaction tagged with the user and returns its checkout URL in the right language", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({ data: { checkout: { url: "https://wadhifa.example/pay?_ptxn=txn_1" } } }),
    );
    const { url } = await paddle(fetchImpl as unknown as typeof fetch).createCheckout({
      userRef: "user-1",
      planId: "pro_monthly",
      priceId: "pri_monthly",
      locale: "ar",
    });
    expect(url).toBe("https://wadhifa.example/pay?_ptxn=txn_1&lang=ar");
    const [calledUrl, init] = fetchImpl.mock.calls[0];
    expect(calledUrl).toBe("https://sandbox-api.paddle.com/transactions");
    expect(JSON.parse(String(init?.body))).toEqual({
      items: [{ price_id: "pri_monthly", quantity: 1 }],
      custom_data: { user_ref: "user-1", plan_id: "pro_monthly" },
    });
  });

  it("explains a missing default payment link", async () => {
    const fetchImpl = async () => Response.json({ data: { checkout: { url: null } } });
    await expect(
      paddle(fetchImpl as typeof fetch).createCheckout({ userRef: "u", planId: "p", priceId: "pri", locale: "ar" }),
    ).rejects.toMatchObject({ kind: "not_configured" });
  });
});

describe("store", () => {
  const sub = (status: "active" | "canceled", updatedAt: string) => ({
    userRef: "user-1",
    provider: "paddle",
    subscriptionId: "sub_1",
    customerId: "ctm_1",
    planId: "pro_monthly",
    status,
    currentPeriodEnd: null,
    updatedAt,
  });

  it("skips duplicate and out-of-order events", async () => {
    const store = new MemoryBillingStore();
    expect(await store.applySubscription(sub("canceled", "2026-11-22T12:00:00Z"), "evt_2")).toBe(true);
    expect(await store.applySubscription(sub("active", "2026-11-22T11:00:00Z"), "evt_1")).toBe(false);
    expect(await store.applySubscription(sub("canceled", "2026-11-22T12:00:00Z"), "evt_2")).toBe(false);
    expect((await store.getSubscription("user-1"))?.status).toBe("canceled");
  });

  it("counts usage by Riyadh calendar month", () => {
    expect(usageMonth(new Date("2026-11-30T21:30:00Z"))).toBe("2026-12");
    expect(usageMonth(new Date("2026-11-30T20:30:00Z"))).toBe("2026-11");
  });
});

describe("entitlement", () => {
  const request = (cookie?: string) => new Request("https://x.test/api/tailor", { headers: cookie ? { cookie } : {} });

  it("gives a new visitor a signed id and rejects a forged one", () => {
    const first = identify(request(), env);
    expect(first.setCookie).toContain(`${IDENTITY_COOKIE}=${first.userRef}.`);
    const cookie = first.setCookie!.split(";")[0];
    expect(identify(request(cookie), env)).toEqual({ userRef: first.userRef, setCookie: null });
    const forged = identify(request(`${IDENTITY_COOKIE}=someone-else.${cookie.split(".")[1]}`), env);
    expect(forged.userRef).not.toBe("someone-else");
  });

  it("stops free users at the monthly limit and lets subscribers through", async () => {
    const store = new MemoryBillingStore();
    const cookie = identify(request(), env).setCookie!.split(";")[0];
    const now = new Date(NOW);
    let e = await entitlementFor(request(cookie), env, store, now);
    await recordPack(e, store, now);
    await recordPack(e, store, now);
    e = await entitlementFor(request(cookie), env, store, now);
    expect(e).toMatchObject({ tier: "free", packsUsed: 2, packsLimit: 2 });
    expect(hasPacksLeft(e)).toBe(false);

    await store.applySubscription(
      {
        userRef: e.identity.userRef,
        provider: "paddle",
        subscriptionId: "sub_1",
        customerId: "ctm_1",
        planId: "pro_monthly",
        status: "past_due",
        currentPeriodEnd: null,
        updatedAt: now.toISOString(),
      },
      "evt_1",
    );
    e = await entitlementFor(request(cookie), env, store, now);
    expect(e).toMatchObject({ tier: "paid", packsLimit: null });
    expect(hasPacksLeft(e)).toBe(true);
  });
});

describe("config", () => {
  it("only sells plans that have a price id, and refuses mock billing in production", () => {
    expect(plansFor("paddle", env).map((p) => p.id)).toEqual(["pro_monthly"]);
    expect(getBillingProvider({ PADDLE_API_KEY: "k" }).name).toBe("paddle");
    expect(getBillingProvider({}).name).toBe("mock");
    expect(() => getBillingProvider({ NODE_ENV: "production" })).toThrow(/not allowed in production/);
  });
});
