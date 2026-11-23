import { createHmac, timingSafeEqual } from "node:crypto";
import { planByPriceId } from "./plans";
import {
  BillingError,
  type BillingProvider,
  type CheckoutRequest,
  type SubscriptionEvent,
  type SubscriptionStatus,
} from "./types";

/**
 * Paddle Billing (merchant of record): Paddle is the seller, so it charges and pays GCC VAT.
 *
 * Setup in the Paddle dashboard:
 * - Checkout settings: set the default payment link to https://<our domain>/pay
 *   (that page loads Paddle.js and opens the checkout).
 * - Notifications: add a webhook to https://<our domain>/api/billing/webhook for
 *   subscription.* events, and copy its secret key into PADDLE_WEBHOOK_SECRET.
 *
 * PADDLE_API_KEY          server API key
 * PADDLE_ENVIRONMENT      sandbox (default) | production
 * PADDLE_WEBHOOK_SECRET   endpoint secret key for webhook signatures
 */

const BASE_URLS = { sandbox: "https://sandbox-api.paddle.com", production: "https://api.paddle.com" } as const;
const SIGNATURE_TOLERANCE_SECONDS = 300;
const STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due", "paused", "canceled"];

export interface PaddleConfig {
  apiKey: string;
  environment: keyof typeof BASE_URLS;
  webhookSecret: string;
  fetch?: typeof fetch;
  now?: () => number;
}

export class PaddleProvider implements BillingProvider {
  readonly name = "paddle";
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;

  constructor(private readonly config: PaddleConfig) {
    this.fetchImpl = config.fetch ?? fetch;
    this.now = config.now ?? Date.now;
  }

  async createCheckout(request: CheckoutRequest): Promise<{ url: string }> {
    const body = {
      items: [{ price_id: request.priceId, quantity: 1 }],
      custom_data: { user_ref: request.userRef, plan_id: request.planId },
    };
    const data = await this.call<{ checkout?: { url?: string | null } }>("POST", "/transactions", body);
    const url = data.checkout?.url;
    if (!url) {
      throw new BillingError(
        "not_configured",
        "Paddle returned no checkout URL. Set a default payment link under Checkout settings in Paddle.",
      );
    }
    const withLocale = new URL(url);
    withLocale.searchParams.set("lang", request.locale);
    return { url: withLocale.toString() };
  }

  async createPortalLink(customerId: string): Promise<{ url: string }> {
    const data = await this.call<{ urls?: { general?: { overview?: string } } }>(
      "POST",
      `/customers/${encodeURIComponent(customerId)}/portal-sessions`,
      {},
    );
    const url = data.urls?.general?.overview;
    if (!url) throw new BillingError("provider_error", "Paddle returned no customer portal URL.");
    return { url };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.call("POST", `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { effective_from: "immediately" });
  }

  async parseWebhook(rawBody: string, headers: Headers): Promise<SubscriptionEvent | null> {
    this.verifySignature(rawBody, headers.get("paddle-signature"));
    let event: PaddleEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new BillingError("provider_error", "Webhook body is not JSON.");
    }
    if (!event.event_type?.startsWith("subscription.")) return null;

    const sub = event.data ?? {};
    const userRef = sub.custom_data?.user_ref;
    if (typeof userRef !== "string" || !sub.id || !sub.customer_id) {
      console.warn(`[billing:paddle] ${event.event_type} ${sub.id ?? "?"} has no user_ref; ignored`);
      return null;
    }
    const status = STATUSES.includes(sub.status as SubscriptionStatus) ? (sub.status as SubscriptionStatus) : null;
    if (!status) {
      console.warn(`[billing:paddle] unknown subscription status "${sub.status}"; ignored`);
      return null;
    }
    const priceId = sub.items?.[0]?.price?.id;
    return {
      eventId: event.event_id ?? "",
      occurredAt: event.occurred_at ?? new Date(this.now()).toISOString(),
      subscription: {
        userRef,
        provider: this.name,
        subscriptionId: sub.id,
        customerId: sub.customer_id,
        planId: (priceId && planByPriceId(this.name, priceId)?.id) || null,
        status,
        currentPeriodEnd: sub.current_billing_period?.ends_at ?? null,
      },
    };
  }

  /** Paddle-Signature: "ts=<unix seconds>;h1=<hex hmac>"; the signed payload is "<ts>:<raw body>". */
  private verifySignature(rawBody: string, header: string | null): void {
    if (!this.config.webhookSecret) throw new BillingError("not_configured", "PADDLE_WEBHOOK_SECRET is not set.");
    if (!header) throw new BillingError("invalid_signature", "Missing Paddle-Signature header.");
    const parts = header.split(";").map((p) => p.split("=") as [string, string]);
    const ts = parts.find(([k]) => k === "ts")?.[1];
    const signatures = parts.filter(([k]) => k === "h1").map(([, v]) => v);
    if (!ts || signatures.length === 0) throw new BillingError("invalid_signature", "Malformed Paddle-Signature header.");
    if (Math.abs(this.now() / 1000 - Number(ts)) > SIGNATURE_TOLERANCE_SECONDS) {
      throw new BillingError("invalid_signature", "Webhook timestamp is too old.");
    }
    const expected = createHmac("sha256", this.config.webhookSecret).update(`${ts}:${rawBody}`).digest();
    const ok = signatures.some((sig) => {
      const given = Buffer.from(sig, "hex");
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
    if (!ok) throw new BillingError("invalid_signature", "Webhook signature does not match.");
  }

  private async call<T>(method: string, path: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(`${BASE_URLS[this.config.environment]}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { data?: T; error?: { code?: string; detail?: string } };
    if (!res.ok || !json.data) {
      throw new BillingError(
        "provider_error",
        `Paddle ${method} ${path} failed (${res.status}): ${json.error?.code ?? ""} ${json.error?.detail ?? ""}`.trim(),
      );
    }
    return json.data;
  }
}

interface PaddleEvent {
  event_id?: string;
  event_type?: string;
  occurred_at?: string;
  data?: {
    id?: string;
    status?: string;
    customer_id?: string;
    custom_data?: Record<string, unknown> | null;
    items?: { price?: { id?: string } }[];
    current_billing_period?: { ends_at?: string } | null;
  };
}
