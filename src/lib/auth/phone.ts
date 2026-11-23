/** GCC country codes we accept at sign-up, with the length of the national number. */
const GCC: Record<string, number> = {
  "966": 9, // Saudi Arabia, 5XXXXXXXX
  "971": 9, // UAE
  "965": 8, // Kuwait
  "974": 8, // Qatar
  "973": 8, // Bahrain
  "968": 8, // Oman
};

/**
 * Turns what a person typed into +<country><number>, or null if it isn't a
 * GCC mobile number. Arabic-Indic digits, spaces, dashes and a leading 0 are fine.
 */
export function normalizePhone(input: string, defaultCountry = "966"): string | null {
  const digits = input
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\s\-().]/g, "");
  let rest = digits.startsWith("+") ? digits.slice(1) : digits.startsWith("00") ? digits.slice(2) : null;
  let country: string | undefined;
  if (rest !== null) {
    country = Object.keys(GCC).find((c) => rest!.startsWith(c));
    if (!country) return null;
    rest = rest.slice(country.length);
  } else {
    country = defaultCountry;
    rest = digits.replace(/^0/, "");
  }
  if (!/^\d+$/.test(rest) || rest.length !== GCC[country]) return null;
  if (country === "966" && !rest.startsWith("5")) return null;
  return `+${country}${rest}`;
}
