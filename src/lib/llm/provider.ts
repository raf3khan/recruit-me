import type { z } from "zod";

/**
 * The only way the app talks to a language model.
 *
 * Every call asks for structured output that matches a Zod schema, so a
 * provider can be swapped (Claude today, a Saudi-hosted model such as ALLaM
 * later) without touching the tailoring code.
 */
export type TaskName = "extract_profile" | "analyze_job" | "tailor_resume" | "write_cover_letter";

export interface StructuredRequest<T> {
  /** Which pipeline step is asking. Used for logging, routing and the mock. */
  task: TaskName;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** The structured input the prompt was built from (the mock provider uses it). */
  input: unknown;
  /** How hard the model should think. Providers may ignore it. */
  effort?: "low" | "medium" | "high";
}

export interface LlmProvider {
  readonly name: string;
  generate<T>(request: StructuredRequest<T>): Promise<T>;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly kind: "refusal" | "invalid_output" | "truncated" | "upstream",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "LlmError";
  }
}
