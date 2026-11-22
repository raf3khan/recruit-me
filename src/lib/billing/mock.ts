import type { BillingStore } from "./store";
import type { BillingProvider, CheckoutRequest, SubscriptionEvent } from "./types";

/**
 * Local development without Paddle keys: "paying" activates the subscription
 * straight away and returns to the home page. Never used in production.
 */
export class MockBillingProvider implements BillingProvider {
  readonly name = "mock";
  constructor(private readonly store: BillingStore) {}

  async createCheckout(request: CheckoutRequest) {
    const now = new Date();
    await this.store.applySubscription(
      {
        userRef: request.userRef,
        provider: this.name,
        subscriptionId: `mock_sub_${request.userRef}`,
        customerId: `mock_cus_${request.userRef}`,
        planId: request.planId,
        status: "active",
        currentPeriodEnd: new Date(now.getTime() + 30 * 86400_000).toISOString(),
        updatedAt: now.toISOString(),
      },
      `mock_evt_${now.getTime()}`,
    );
    return { url: "/?billing=success" };
  }

  async createPortalLink() {
    return { url: "/?billing=portal" };
  }

  async parseWebhook(): Promise<SubscriptionEvent | null> {
    return null;
  }
}
