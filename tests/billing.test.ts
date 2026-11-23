import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applySubscriptionEvent,
  getBillingProvider,
  latestSubscription,
  plansFor,
  type SubscriptionEvent,
  type SubscriptionStatus,
} from "@/lib/billing";
import { PaddleProvider } from "@/lib/billing/paddle";
import { openDb, type Db } from "@/lib/db";
import { subscriptions, users } from "@/lib/db/schema";

const SECRET = "pdl_ntfset_test";
const NOW = Date.parse("2026-11-22T12:00:00Z");

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
    vi.stubEnv("PADDLE_PRICE_PLUS_MONTHLY", "pri_monthly");
    const body = subscriptionEvent();
    const event = await paddle().parseWebhook(body, signed(body));
    expect(event?.subscription).toMatchObject({ userRef: "user-1", status: "active", planId: "plus_monthly", customerId: "ctm_1" });
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
      planId: "plus_monthly",
      priceId: "pri_monthly",
      locale: "ar",
    });
    expect(url).toBe("https://wadhifa.example/pay?_ptxn=txn_1&lang=ar");
    const [calledUrl, init] = fetchImpl.mock.calls[0];
    expect(calledUrl).toBe("https://sandbox-api.paddle.com/transactions");
    expect(JSON.parse(String(init?.body))).toEqual({
      items: [{ price_id: "pri_monthly", quantity: 1 }],
      custom_data: { user_ref: "user-1", plan_id: "plus_monthly" },
    });
  });

  it("explains a missing default payment link", async () => {
    const fetchImpl = async () => Response.json({ data: { checkout: { url: null } } });
    await expect(
      paddle(fetchImpl as typeof fetch).createCheckout({ userRef: "u", planId: "p", priceId: "pri", locale: "ar" }),
    ).rejects.toMatchObject({ kind: "not_configured" });
  });
});

describe("subscription events", () => {
  let db: Db;
  let userId: string;
  beforeEach(async () => {
    db = await openDb("memory");
    [{ id: userId }] = await db.insert(users).values({ phone: "+966551234567" }).returning({ id: users.id });
  });

  const event = (status: SubscriptionStatus, occurredAt: string, ref = userId): SubscriptionEvent => ({
    eventId: `evt_${occurredAt}`,
    occurredAt,
    subscription: {
      userRef: ref,
      provider: "paddle",
      subscriptionId: "sub_1",
      customerId: "ctm_1",
      planId: "plus_monthly",
      status,
      currentPeriodEnd: "2026-12-22T00:00:00Z",
    },
  });
  const planOf = async () => (await db.select().from(users).where(eq(users.id, userId)))[0].plan;

  it("moves the user to Plus, keeps Plus while past due, and back to Free when canceled", async () => {
    expect(await applySubscriptionEvent(db, event("active", "2026-11-22T10:00:00Z"))).toBe(true);
    expect(await planOf()).toBe("plus");
    await applySubscriptionEvent(db, event("past_due", "2026-11-23T10:00:00Z"));
    expect(await planOf()).toBe("plus");
    await applySubscriptionEvent(db, event("canceled", "2026-11-24T10:00:00Z"));
    expect(await planOf()).toBe("free");
    expect((await latestSubscription(db, userId))?.status).toBe("canceled");
  });

  it("skips late and repeated events, and events for unknown users", async () => {
    await applySubscriptionEvent(db, event("canceled", "2026-11-22T12:00:00Z"));
    expect(await applySubscriptionEvent(db, event("active", "2026-11-22T11:00:00Z"))).toBe(false);
    expect(await applySubscriptionEvent(db, event("canceled", "2026-11-22T12:00:00Z"))).toBe(false);
    expect(await planOf()).toBe("free");
    expect(await applySubscriptionEvent(db, event("active", "2026-11-22T13:00:00Z", "00000000-0000-0000-0000-000000000000"))).toBe(false);
  });

  it("deletes the subscription record with the account", async () => {
    await applySubscriptionEvent(db, event("active", "2026-11-22T10:00:00Z"));
    await db.delete(users).where(eq(users.id, userId));
    expect(await db.select().from(subscriptions)).toEqual([]);
  });
});

describe("config", () => {
  it("only sells plans that have a price id, and refuses mock billing in production outside test mode", () => {
    expect(plansFor("paddle", { PADDLE_PRICE_PLUS_MONTHLY: "pri_monthly" }).map((p) => p.id)).toEqual(["plus_monthly"]);
    expect(getBillingProvider({ PADDLE_API_KEY: "k" }).name).toBe("paddle");
    expect(getBillingProvider({}).name).toBe("mock");
    expect(() => getBillingProvider({ NODE_ENV: "production" })).toThrow(/only allowed in test mode/);
    expect(getBillingProvider({ NODE_ENV: "production", TEST_MODE: "on" }).name).toBe("mock");
  });
});
