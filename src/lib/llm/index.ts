import { AnthropicProvider } from "./anthropic";
import { MockProvider } from "./mock";
import type { LlmProvider } from "./provider";

export type { LlmProvider } from "./provider";
export { LlmError } from "./provider";

/**
 * Picks the provider from the environment.
 *
 * LLM_PROVIDER=anthropic (default when ANTHROPIC_API_KEY is set) | mock
 * ANTHROPIC_MODEL overrides the Claude model.
 *
 * A Saudi-hosted provider (for example ALLaM on a KSA cloud region) is added
 * by implementing LlmProvider and adding a case here.
 */
export function getProvider(env: Record<string, string | undefined> = process.env): LlmProvider {
  const choice = env.LLM_PROVIDER ?? (env.ANTHROPIC_API_KEY ? "anthropic" : "mock");
  switch (choice) {
    case "anthropic":
      return new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL });
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`Unknown LLM_PROVIDER "${choice}". Use "anthropic" or "mock".`);
  }
}
