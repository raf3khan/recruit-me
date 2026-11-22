"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { currentUser } from "@/lib/auth/current";
import { requestCode, verifyCode } from "@/lib/auth/otp";
import { normalizePhone } from "@/lib/auth/phone";
import { SESSION_COOKIE, createSession, deleteSession } from "@/lib/auth/session";
import { getSmsSender } from "@/lib/auth/sms";
import * as service from "@/lib/app/service";
import { CITIES, ROLES, SECTORS } from "@/lib/app/options";
import { SAMPLE_JOBS } from "@/lib/app/sample-jobs";
import { getDb } from "@/lib/db";
import type { Application, Preferences, User } from "@/lib/db/schema";
import { isLang, translator, type Lang } from "@/lib/i18n";
import { getProvider, LlmError } from "@/lib/llm";
import { tierFor } from "@/lib/tier";
import { extractProfile } from "@/lib/tailoring/pipeline";
import { SAMPLE_PROFILE } from "@/lib/tailoring/sample";
import { AddressFormSchema, CandidateProfileSchema } from "@/lib/tailoring/schemas";

/**
 * Server Actions. Every action re-reads the session itself and only acts on
 * the signed-in user's own data; nothing from the form is trusted for identity.
 */

export type FormState = { error?: string; ok?: boolean; devCode?: string; phone?: string; limit?: boolean } | null;

const isProd = process.env.NODE_ENV === "production";

function langOf(form: FormData): Lang {
  const v = String(form.get("lang") ?? "ar");
  return isLang(v) ? v : "ar";
}

async function userOrRedirect(lang: Lang): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/${lang}/signup`);
  return user;
}

function llmMessage(lang: Lang, error: unknown): string {
  const t = translator(lang);
  if (error instanceof LlmError && error.kind === "refusal")
    return t("We couldn't prepare this. Check the text and try again.", "ما قدرنا نجهّز هذا الطلب. راجع النص وجرّب مرة ثانية.");
  if (error instanceof LlmError) return t("A temporary problem. Try again shortly.", "صار خلل مؤقت في التجهيز. جرّب بعد شوي.");
  console.error(error);
  return t("Something went wrong. Try again.", "صار خطأ غير متوقع. جرّب مرة ثانية.");
}

// --- sign-up -----------------------------------------------------------------

export async function requestCodeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const lang = langOf(form);
  const t = translator(lang);
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return { error: t("Enter a Gulf mobile number, for example 05X XXX XXXX.", "اكتب رقم جوال خليجي، مثل 05X XXX XXXX.") };
  if (form.get("agree") !== "on")
    return { error: t("Please agree to the terms and privacy policy to continue.", "للمتابعة لازم الموافقة على الشروط وسياسة الخصوصية.") };
  const result = await requestCode(await getDb(), phone, getSmsSender());
  if (!result.ok) return { error: t("Too many codes. Try again in an hour.", "طلبات كثيرة. جرّب مرة ثانية بعد ساعة.") };
  return { ok: true, phone, devCode: isProd ? undefined : result.devCode };
}

export async function verifyCodeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const lang = langOf(form);
  const t = translator(lang);
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!phone || code.length !== 4) return { ok: true, phone: phone ?? undefined, error: t("Enter the 4-digit code.", "اكتب الرمز من 4 أرقام.") };

  const db = await getDb();
  const result = await verifyCode(db, phone, code);
  if (!result.ok) {
    const error =
      result.reason === "wrong"
        ? t("That code isn't right. Check it and try again.", "الرمز غير صحيح. تأكد منه وجرّب مرة ثانية.")
        : result.reason === "too_many"
          ? t("Too many tries. Ask for a new code.", "محاولات كثيرة. اطلب رمز جديد.")
          : t("The code has expired. Ask for a new one.", "انتهت صلاحية الرمز. اطلب رمز جديد.");
    return { ok: true, phone, error };
  }
  if (result.isNew) await service.recordConsent(db, result.userId);
  const session = await createSession(db, result.userId);
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  redirect(`/${lang}/onboard`);
}

export async function logoutAction(form: FormData) {
  const lang = langOf(form);
  const jar = await cookies();
  await deleteSession(await getDb(), jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect(`/${lang}/signup`);
}

// --- onboarding --------------------------------------------------------------

export async function setAddressAction(form: FormData) {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  const parsed = AddressFormSchema.safeParse(form.get("address"));
  if (parsed.success) await service.setAddressForm(await getDb(), user, parsed.data);
  const next = String(form.get("next") ?? "");
  if (next === "account") refresh();
  else redirect(`/${lang}/onboard?step=cv`);
}

export async function readCvAction(_prev: FormState, form: FormData): Promise<FormState> {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  const t = translator(lang, user.addressForm);
  const text = String(form.get("cv") ?? "").trim();
  if (text.length < 50) return { error: t("Paste your full CV text.", "الصق نص سيرتك الذاتية كامل.", "الصقي نص سيرتك الذاتية كامل.") };
  if (text.length > 30000)
    return { error: t("The text is too long. Shorten it to under 30,000 characters.", "النص أطول من اللازم. اختصره لأقل من 30 ألف حرف.", "النص أطول من اللازم. اختصريه لأقل من 30 ألف حرف.") };
  try {
    const profile = await extractProfile(getProvider(tierFor(user)), text);
    await service.saveProfile(await getDb(), user, profile);
  } catch (error) {
    return { error: llmMessage(lang, error) };
  }
  redirect(`/${lang}/${form.get("from") === "profile" ? "profile" : "onboard?step=check"}`);
}

/** Development only: fills the profile with the made-up sample graduate. */
export async function sampleCvAction(form: FormData) {
  const lang = langOf(form);
  if (isProd) redirect(`/${lang}/onboard?step=cv`);
  const user = await userOrRedirect(lang);
  await service.saveProfile(await getDb(), user, SAMPLE_PROFILE);
  redirect(`/${lang}/onboard?step=check`);
}


function readPreferences(form: FormData): Preferences {
  const pick = (name: string, allowed: string[]) => form.getAll(name).map(String).filter((v) => allowed.includes(v));
  const workType = String(form.get("workType"));
  return {
    roles: pick("roles", ROLES),
    cities: pick("cities", CITIES),
    sectors: pick("sectors", SECTORS),
    workType: workType === "grad" || workType === "intern" ? workType : "full",
  };
}

export async function savePreferencesAction(form: FormData) {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  const onboarding = form.get("from") === "onboard";
  await service.savePreferences(await getDb(), user, readPreferences(form), onboarding);
  if (onboarding) redirect(`/${lang}/onboard?step=done`);
  refresh();
}

// --- profile -----------------------------------------------------------------

/** Saves edits to the CV facts. The whole profile is validated again before saving. */
export async function saveProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  const t = translator(lang, user.addressForm);
  let parsed;
  try {
    parsed = CandidateProfileSchema.safeParse(JSON.parse(String(form.get("profile") ?? "")));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) return { error: t("Some details are missing. Check the fields and try again.", "بعض المعلومات ناقصة. راجع الحقول وجرّب مرة ثانية.", "بعض المعلومات ناقصة. راجعي الحقول وجرّبي مرة ثانية.") };
  await service.saveProfile(await getDb(), user, parsed.data);
  refresh();
  return { ok: true };
}

// --- jobs --------------------------------------------------------------------

const JobForm = z.object({
  title: z.string().trim().min(2).max(200),
  company: z.string().trim().max(200),
  location: z.string().trim().max(200),
  url: z.union([z.literal(""), z.url().max(1000)]),
  description: z.string().trim().min(80).max(20000),
});

export async function addJobAction(_prev: FormState, form: FormData): Promise<FormState> {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  const t = translator(lang, user.addressForm);
  const parsed = JobForm.safeParse(Object.fromEntries(["title", "company", "location", "url", "description"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "description") return { error: t("Paste the full job description (at least a few lines).", "الصق وصف الوظيفة كامل (على الأقل كم سطر).", "الصقي وصف الوظيفة كامل (على الأقل كم سطر).") };
    if (field === "url") return { error: t("The link doesn't look right. Copy it from the browser bar.", "الرابط مو صحيح. انسخه من شريط المتصفح.", "الرابط مو صحيح. انسخيه من شريط المتصفح.") };
    return { error: t("Add the job title.", "أضف المسمى الوظيفي.", "أضيفي المسمى الوظيفي.") };
  }
  const { title, company, location, url, description } = parsed.data;
  const job = await service.addJob(await getDb(), user, { title, company, location, url: url || null, description });
  redirect(`/${lang}/jobs/${job.id}`);
}

/** Development only: adds the made-up demo jobs so the list isn't empty. */
export async function loadSampleJobsAction(form: FormData) {
  const lang = langOf(form);
  if (isProd) return;
  const user = await userOrRedirect(lang);
  const db = await getDb();
  for (const job of SAMPLE_JOBS) await service.addJob(db, user, job, "sample");
  refresh();
}

export async function prepareAction(_prev: FormState, form: FormData): Promise<FormState> {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  try {
    await service.prepareJob(await getDb(), user, String(form.get("jobId")), getProvider(tierFor(user)));
  } catch (error) {
    if (error instanceof service.LimitReached) return { limit: true };
    if (error instanceof service.NotFound) redirect(`/${lang}/jobs`);
    return { error: llmMessage(lang, error) };
  }
  refresh();
  return { ok: true };
}

const LetterForm = z.object({ greeting: z.string().max(300), closing: z.string().max(200), paragraphs: z.array(z.string().max(4000)).min(1).max(8) });

export async function saveLetterAction(form: FormData) {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  const parsed = LetterForm.safeParse({
    greeting: String(form.get("greeting") ?? ""),
    closing: String(form.get("closing") ?? ""),
    paragraphs: form.getAll("paragraph").map(String).filter((p) => p.trim()),
  });
  if (parsed.success) await service.saveLetter(await getDb(), user, String(form.get("jobId")), parsed.data);
}

export async function skipAction(form: FormData) {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  await service.skipJob(await getDb(), user, String(form.get("jobId")));
  redirect(`/${lang}/jobs`);
}

export async function sendAction(_prev: FormState, form: FormData): Promise<FormState> {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  const method = String(form.get("method")) as Application["method"];
  if (!["site", "email", "word"].includes(method)) return { error: "bad_method" };
  try {
    await service.markSent(await getDb(), user, String(form.get("jobId")), method);
  } catch (error) {
    if (error instanceof service.LimitReached) return { limit: true };
    throw error;
  }
  refresh();
  return { ok: true };
}

// --- applications ------------------------------------------------------------

export async function setStatusAction(form: FormData) {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  const status = String(form.get("status")) as Application["status"];
  if (!["sent", "reply", "interview", "offer", "closed"].includes(status)) return;
  await service.setApplicationStatus(await getDb(), user, String(form.get("applicationId")), status);
  refresh();
}

export async function followedUpAction(form: FormData) {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  await service.markFollowedUp(await getDb(), user, String(form.get("applicationId")));
  refresh();
}

// --- account -----------------------------------------------------------------

export async function notificationsAction(form: FormData) {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  await service.saveNotifications(await getDb(), user, {
    daily: form.get("daily") === "on",
    followUp: form.get("followUp") === "on",
    weekly: form.get("weekly") === "on",
  });
  refresh();
}

/** Payments aren't connected yet. Outside production this switches the plan so Plus can be tested. */
export async function devSetPlanAction(form: FormData) {
  const lang = langOf(form);
  if (isProd) return;
  const user = await userOrRedirect(lang);
  await service.setPlan(await getDb(), user, form.get("plan") === "plus" ? "plus" : "free");
  refresh();
}

export async function deleteAccountAction(form: FormData) {
  const lang = langOf(form);
  const user = await userOrRedirect(lang);
  if (form.get("confirm") !== "yes") return;
  const db = await getDb();
  await service.deleteAccount(db, user);
  (await cookies()).delete(SESSION_COOKIE);
  redirect(`/${lang}/signup?deleted=1`);
}
