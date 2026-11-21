import { AnthropicProvider } from "./anthropic";
import { MockProvider } from "./mock";
import type { LlmProvider } from "./provider";

export type { LlmProvider } from "./provider";
export { LlmError } from "./provider";

/** Free users get the low-cost model; paying users get better writing. */
export type Tier = "free" | "paid";

export const DEFAULT_MODELS: Record<Tier, string> = {
  free: "claude-haiku-5-5",
  paid: "claude-sonnet-5-5",
};

/**
 * Picks the provider and model from the environment and the user's tier.
 *
 * LLM_PROVIDER         anthropic (default when ANTHROPIC_API_KEY is set) | mock
 * ANTHROPIC_MODEL_FREE model for the free tier (default claude-haiku-5-5)
 * ANTHROPIC_MODEL_PAID model for the paid tier (default claude-sonnet-5-5)
 *
 * A Saudi-hosted provider (for example ALLaM on a KSA cloud region) is added
 * by implementing LlmProvider and adding a case here.
 */
export function getProvider(tier: Tier, env: Record<string, string | undefined> = process.env): LlmProvider {
  const choice = env.LLM_PROVIDER || (env.ANTHROPIC_API_KEY ? "anthropic" : "mock");
  switch (choice) {
    case "anthropic": {
      const model = (tier === "paid" ? env.ANTHROPIC_MODEL_PAID : env.ANTHROPIC_MODEL_FREE) || DEFAULT_MODELS[tier];
      return new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, model });
    }
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`Unknown LLM_PROVIDER "${choice}". Use "anthropic" or "mock".`);
  }
}
