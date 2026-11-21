import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { LlmError, type LlmProvider, type StructuredRequest } from "./provider";

const DEFAULT_MODEL = "claude-opus-5-5";

/**
 * Claude via the Anthropic API, with structured outputs.
 *
 * Server-side refusal fallbacks are on ("default" routing), so a rare policy
 * decline is retried on a fallback model inside the same call.
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    // With no apiKey the SDK reads ANTHROPIC_API_KEY (or other configured credentials).
    this.client = new Anthropic(options.apiKey ? { apiKey: options.apiKey } : {});
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async generate<T>(request: StructuredRequest<T>): Promise<T> {
    let response;
    try {
      response = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: request.system,
        messages: [{ role: "user", content: request.prompt }],
        output_config: {
          effort: request.effort ?? "medium",
          format: betaZodOutputFormat(request.schema),
        },
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new LlmError(`Anthropic API error (${error.status ?? "network"}): ${error.message}`, "upstream", {
          cause: error,
        });
      }
      throw error;
    }

    if (response.stop_reason === "refusal") {
      throw new LlmError(`The model declined the ${request.task} request.`, "refusal");
    }
    if (response.stop_reason === "max_tokens") {
      throw new LlmError(`The ${request.task} output was cut off.`, "truncated");
    }
    if (response.parsed_output == null) {
      throw new LlmError(`The ${request.task} output did not match its schema.`, "invalid_output");
    }
    return response.parsed_output as T;
  }
}
