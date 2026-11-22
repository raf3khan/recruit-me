import { MockBillingProvider } from "./mock";
import { PaddleProvider } from "./paddle";
import { MemoryBillingStore, type BillingStore } from "./store";
import type { BillingProvider } from "./types";

export * from "./types";
export * from "./plans";
export { usageMonth, type BillingStore } from "./store";

type Env = Record<string, string | undefined>;

// One store per server process until a database-backed store replaces it.
const globalStore = globalThis as unknown as { __wadhifaBillingStore?: BillingStore };
export function getBillingStore(): BillingStore {
  globalStore.__wadhifaBillingStore ??= new MemoryBillingStore();
  return globalStore.__wadhifaBillingStore;
}

/**
 * BILLING_PROVIDER  paddle (default when PADDLE_API_KEY is set) | mock
 *
 * Tap (mada, STC Pay, KNET, Benefit) is added later by implementing
 * BillingProvider and adding a case here, once there is a UAE company.
 */
export function getBillingProvider(env: Env = process.env, store: BillingStore = getBillingStore()): BillingProvider {
  const choice = env.BILLING_PROVIDER || (env.PADDLE_API_KEY ? "paddle" : "mock");
  switch (choice) {
    case "paddle": {
      if (!env.PADDLE_API_KEY) throw new Error("BILLING_PROVIDER is paddle but PADDLE_API_KEY is not set.");
      const environment = env.PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox";
      return new PaddleProvider({ apiKey: env.PADDLE_API_KEY, environment, webhookSecret: env.PADDLE_WEBHOOK_SECRET ?? "" });
    }
    case "mock":
      if (env.NODE_ENV === "production") throw new Error("Mock billing is not allowed in production. Set PADDLE_API_KEY.");
      return new MockBillingProvider(store);
    default:
      throw new Error(`Unknown BILLING_PROVIDER "${choice}". Use "paddle" or "mock".`);
  }
}
