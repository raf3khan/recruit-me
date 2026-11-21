import type { Tier } from "./llm";

/**
 * Which tier this request is served on.
 *
 * Decided on the server only, never from anything the browser sends, so the
 * paywall can't be skipped. There are no accounts yet, so everyone is on the
 * free tier. When accounts arrive (step 4), this looks up the user's plan and
 * usage and returns "paid" for subscribers; usage limits are enforced there too.
 */
export async function tierFor(request: Request): Promise<Tier> {
  void request;
  return "free";
}
