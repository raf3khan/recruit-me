import type { BillingProvider, CheckoutRequest, SubscriptionEvent } from "./types";

/**
 * Development without Paddle keys. Checkout returns a synthetic "activated"
 * event that the caller applies at once, then goes back to the plans page.
 * Never used in production.
 */
export class MockBillingProvider implements BillingProvider {
  readonly name = "mock";

  async createCheckout(request: CheckoutRequest) {
    return { url: `/${request.locale}/plans?billing=success` };
  }

  activationEvent(request: CheckoutRequest, now = new Date()): SubscriptionEvent {
    return {
      eventId: `mock_evt_${now.getTime()}`,
      occurredAt: now.toISOString(),
      subscription: {
        userRef: request.userRef,
        provider: this.name,
        subscriptionId: `mock_sub_${request.userRef}`,
        customerId: `mock_cus_${request.userRef}`,
        planId: request.planId,
        status: "active",
        currentPeriodEnd: new Date(now.getTime() + 30 * 86400_000).toISOString(),
      },
    };
  }

  async cancelSubscription() {}

  async createPortalLink() {
    return { url: "/ar/plans" };
  }

  async parseWebhook(): Promise<SubscriptionEvent | null> {
    return null;
  }
}
