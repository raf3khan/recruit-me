import type { Tier } from "./llm";
import type { User } from "./db/schema";

/**
 * Which model tier serves this user. Decided on the server from the stored
 * plan, never from anything the browser sends, so the paywall can't be skipped.
 */
export function tierFor(user: Pick<User, "plan"> | null): Tier {
  return user?.plan === "plus" ? "paid" : "free";
}
