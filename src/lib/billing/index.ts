import { MockBillingProvider } from "./mock";
import { PaddleProvider } from "./paddle";
import type { BillingProvider } from "./types";

export * from "./types";
export * from "./plans";
export { applySubscriptionEvent, latestSubscription } from "./store";
export { MockBillingProvider } from "./mock";

type Env = Record<string, string | undefined>;

/**
 * BILLING_PROVIDER  paddle (default when PADDLE_API_KEY is set) | mock
 *
 * Tap (mada, STC Pay, KNET, Benefit) is added later by implementing
 * BillingProvider and adding a case here, once there is a company.
 */
export function getBillingProvider(env: Env = process.env): BillingProvider {
  const choice = env.BILLING_PROVIDER || (env.PADDLE_API_KEY ? "paddle" : "mock");
  switch (choice) {
    case "paddle": {
      if (!env.PADDLE_API_KEY) throw new Error("BILLING_PROVIDER is paddle but PADDLE_API_KEY is not set.");
      const environment = env.PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox";
      return new PaddleProvider({ apiKey: env.PADDLE_API_KEY, environment, webhookSecret: env.PADDLE_WEBHOOK_SECRET ?? "" });
    }
    case "mock":
      if (env.NODE_ENV === "production") throw new Error("Mock billing is not allowed in production. Set PADDLE_API_KEY.");
      return new MockBillingProvider();
    default:
      throw new Error(`Unknown BILLING_PROVIDER "${choice}". Use "paddle" or "mock".`);
  }
}
