/**
 * Who runs Wadhifa, as shown in the legal pages. Fill these in before Paddle's
 * domain review: Paddle wants the seller's legal name in the Terms.
 *
 * LEGAL_OPERATOR_NAME    your full legal name (sole trader) or, later, the LLC's name
 * LEGAL_CONTACT_EMAIL    support and privacy contact
 * LEGAL_COUNTRY_EN / _AR where you (or the company) are based, e.g. "Saudi Arabia" / "المملكة العربية السعودية"
 */
export function operator(env: Record<string, string | undefined> = process.env) {
  return {
    name: env.LEGAL_OPERATOR_NAME || "[LEGAL_OPERATOR_NAME]",
    email: env.LEGAL_CONTACT_EMAIL || "[LEGAL_CONTACT_EMAIL]",
    country: { en: env.LEGAL_COUNTRY_EN || "[country]", ar: env.LEGAL_COUNTRY_AR || "[الدولة]" },
  };
}

/** Bump when the text changes in a way users should be told about. Stored with sign-up consent. */
export const LEGAL_VERSION = "2026-11-23";
export const LEGAL_UPDATED = { en: "23 November 2026", ar: "23 نوفمبر 2026" };
