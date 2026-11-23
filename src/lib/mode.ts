/**
 * Test mode: sign-in codes shown on the page, sample CV and jobs, a plan switch, and mock billing.
 * Always on in development. On a hosted test site, turn it on with TEST_MODE=on.
 * Never set TEST_MODE on the real site: anyone could sign in to any phone number.
 */
export function isTestMode(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" || env.TEST_MODE === "on";
}

/** A hosted test site (production build with TEST_MODE=on), which shows a banner. */
export function isHostedTest(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "production" && env.TEST_MODE === "on";
}
