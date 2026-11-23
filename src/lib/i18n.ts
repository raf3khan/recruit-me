import type { AddressForm } from "@/lib/tailoring/schemas";

export type Lang = "ar" | "en";
export const LANGS: Lang[] = ["ar", "en"];
export const isLang = (v: string): v is Lang => v === "ar" || v === "en";

/**
 * Picks the line for the reader. Arabic copy is written masculine by default
 * with an optional feminine form, and the user's choice from onboarding picks
 * one. Before the user has chosen (sign-up), pages pass gender-neutral Arabic.
 *
 *   const t = translator(lang, user.addressForm);
 *   t("Send application", "أرسل التقديم", "أرسلي التقديم")
 */
export type T = (en: string, ar: string, arFeminine?: string) => string;

export function translator(lang: Lang, address: AddressForm = "neutral"): T {
  return (en, ar, arFeminine) => (lang === "en" ? en : address === "feminine" && arFeminine ? arFeminine : ar);
}

/**
 * Arabic counted nouns: 1 and 2 have their own forms, 3-10 take the plural,
 * 11 and up (and 0) take the singular. English just adds an "s".
 */
export function countAr(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  const r = n % 100;
  return r >= 3 && r <= 10 ? `${n} ${few}` : `${n} ${many}`;
}

export const days = (lang: Lang, n: number) =>
  lang === "en" ? `${n} day${n === 1 ? "" : "s"}` : countAr(n, "يوم", "يومين", "أيام", "يوم");
export const jobsCount = (lang: Lang, n: number) =>
  lang === "en" ? `${n} job${n === 1 ? "" : "s"}` : countAr(n, "وظيفة واحدة", "وظيفتين", "وظائف", "وظيفة");
export const packsCount = (lang: Lang, n: number) =>
  lang === "en" ? `${n} pack${n === 1 ? "" : "s"}` : countAr(n, "تجهيز واحد", "تجهيزين", "تجهيزات", "تجهيز");

/** Whole days between `from` and now. */
export const daysSince = (from: Date, now = new Date()) => Math.floor((now.getTime() - from.getTime()) / 86400000);

export function daysAgo(lang: Lang, from: Date, now = new Date()): string {
  const n = daysSince(from, now);
  if (n <= 0) return lang === "en" ? "Today" : "اليوم";
  if (n === 1) return lang === "en" ? "Yesterday" : "أمس";
  return lang === "en" ? `${days(lang, n)} ago` : `قبل ${days(lang, n)}`;
}
