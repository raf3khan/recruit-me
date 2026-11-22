/** Provider-neutral billing types. Paddle today, Tap later: both plug in behind BillingProvider. */

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "paused" | "canceled";

/** What we keep about a user's subscription, whoever the provider is. */
export interface Subscription {
  userRef: string;
  provider: string;
  subscriptionId: string;
  customerId: string;
  planId: string | null;
  status: SubscriptionStatus;
  /** End of the period already paid for (ISO date), if the provider gave one. */
  currentPeriodEnd: string | null;
  updatedAt: string;
}

/** A verified webhook, normalised. Events we don't act on come back as null. */
export interface SubscriptionEvent {
  eventId: string;
  occurredAt: string;
  subscription: Omit<Subscription, "updatedAt">;
}

export interface CheckoutRequest {
  userRef: string;
  planId: string;
  /** Provider price id for the plan. */
  priceId: string;
  email?: string;
  locale: "ar" | "en";
}

export interface BillingProvider {
  readonly name: string;
  /** Starts a checkout and returns the URL to send the candidate to. */
  createCheckout(request: CheckoutRequest): Promise<{ url: string }>;
  /** Link to the provider's self-serve page (update card, cancel, invoices). */
  createPortalLink(customerId: string): Promise<{ url: string }>;
  /** Verifies the signature and parses the body. Throws BillingError("invalid_signature") on a bad signature. */
  parseWebhook(rawBody: string, headers: Headers): Promise<SubscriptionEvent | null>;
}

export class BillingError extends Error {
  constructor(
    readonly kind: "invalid_signature" | "not_configured" | "provider_error" | "unknown_plan",
    message: string,
  ) {
    super(message);
    this.name = "BillingError";
  }
}

/** Statuses that unlock the paid tier. past_due keeps access while the provider retries the card. */
export function grantsPaidAccess(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}
