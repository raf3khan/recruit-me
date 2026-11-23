import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { applications, consents, jobs, packs, users, type Application, type Job, type Pack, type Preferences, type User, subscriptions } from "@/lib/db/schema";
import type { LlmProvider } from "@/lib/llm";
import { buildApplicationPack } from "@/lib/tailoring/pipeline";
import type { AddressForm, CandidateProfile, CoverLetter, JobPosting } from "@/lib/tailoring/schemas";
import { fitLevel } from "./fit";
import { usageFor } from "./usage";

/**
 * Everything the app does with a user's data. Each function takes the signed-in
 * user and only touches that user's rows, so callers can't reach anyone else's.
 */

export class LimitReached extends Error {
  constructor() {
    super("free_limit");
  }
}
export class NotFound extends Error {}

export { LEGAL_VERSION as TERMS_VERSION } from "@/lib/legal/operator";
import { LEGAL_VERSION as TERMS_VERSION } from "@/lib/legal/operator";

export async function recordConsent(db: Db, userId: string) {
  await db.insert(consents).values([
    { userId, kind: "terms", version: TERMS_VERSION },
    { userId, kind: "privacy", version: TERMS_VERSION },
  ]);
}

export async function setAddressForm(db: Db, user: User, addressForm: AddressForm) {
  await db.update(users).set({ addressForm }).where(eq(users.id, user.id));
}

export async function setLang(db: Db, user: User, lang: "ar" | "en") {
  await db.update(users).set({ lang }).where(eq(users.id, user.id));
}

export async function saveProfile(db: Db, user: User, profile: CandidateProfile) {
  await db.update(users).set({ profile }).where(eq(users.id, user.id));
  // Fit levels depend on the profile.
  const rows = await db.select().from(jobs).where(eq(jobs.userId, user.id));
  for (const job of rows) {
    await db.update(jobs).set({ fit: fitLevel(profile, job.description) }).where(eq(jobs.id, job.id));
  }
}

export async function savePreferences(db: Db, user: User, preferences: Preferences, finishOnboarding = false) {
  await db
    .update(users)
    .set({ preferences, ...(finishOnboarding ? { onboardedAt: new Date() } : {}) })
    .where(eq(users.id, user.id));
}

export async function saveNotifications(db: Db, user: User, notifications: User["notifications"]) {
  await db.update(users).set({ notifications }).where(eq(users.id, user.id));
}

export async function addJob(db: Db, user: User, posting: JobPosting, source: Job["source"] = "manual"): Promise<Job> {
  const [job] = await db
    .insert(jobs)
    .values({
      userId: user.id,
      title: posting.title.trim(),
      company: posting.company?.trim() || null,
      location: posting.location?.trim() || null,
      description: posting.description.trim(),
      url: posting.url?.trim() || null,
      source,
      fit: fitLevel(user.profile, posting.description),
    })
    .returning();
  return job;
}

export interface JobRow {
  job: Job;
  pack: Pack | null;
  application: Application | null;
}

/** Jobs not skipped, best fit first, newest first within a fit level. */
export async function listJobs(db: Db, user: User): Promise<JobRow[]> {
  const rows = await db
    .select({ job: jobs, pack: packs, application: applications })
    .from(jobs)
    .leftJoin(packs, eq(packs.jobId, jobs.id))
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .where(and(eq(jobs.userId, user.id), eq(jobs.skipped, false)))
    .orderBy(desc(jobs.fit), desc(jobs.createdAt));
  return rows;
}

export async function getJob(db: Db, user: User, jobId: string): Promise<JobRow> {
  const [row] = await db
    .select({ job: jobs, pack: packs, application: applications })
    .from(jobs)
    .leftJoin(packs, eq(packs.jobId, jobs.id))
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .where(and(eq(jobs.userId, user.id), eq(jobs.id, jobId)));
  if (!row) throw new NotFound();
  return row;
}

/**
 * Prepares the resume and letter for one job. Free users are limited per month;
 * the check runs here on the server, never in the browser. Preparing a job that
 * already has a pack returns the existing one and costs nothing.
 */
export async function prepareJob(db: Db, user: User, jobId: string, llm: LlmProvider & { model?: string }): Promise<Pack> {
  const row = await getJob(db, user, jobId);
  if (row.pack) return row.pack;
  if (!user.profile) throw new Error("profile_missing");
  const usage = await usageFor(db, user);
  if (usage.left !== null && usage.left <= 0) throw new LimitReached();

  const { job } = row;
  const built = await buildApplicationPack(
    llm,
    user.profile,
    { title: job.title, company: job.company, location: job.location, description: job.description, url: job.url },
    user.addressForm,
  );
  const { job: _posting, ...pack } = built;
  void _posting;
  const [saved] = await db
    .insert(packs)
    .values({ userId: user.id, jobId: job.id, pack, letter: pack.coverLetter, model: llm.model ?? llm.name })
    .onConflictDoNothing()
    .returning();
  if (saved) return saved;
  return (await getJob(db, user, jobId)).pack!;
}

export async function saveLetter(db: Db, user: User, jobId: string, letter: CoverLetter) {
  await db.update(packs).set({ letter }).where(and(eq(packs.userId, user.id), eq(packs.jobId, jobId)));
}

export async function skipJob(db: Db, user: User, jobId: string) {
  await db.update(jobs).set({ skipped: true }).where(and(eq(jobs.userId, user.id), eq(jobs.id, jobId)));
}

/**
 * Records that the candidate sent this application. Called only from the
 * candidate's own confirm tap; nothing is ever sent automatically.
 */
export async function markSent(db: Db, user: User, jobId: string, method: Application["method"]): Promise<Application> {
  const row = await getJob(db, user, jobId);
  if (!row.pack) throw new Error("not_prepared");
  if (method === "email" && user.plan !== "plus") throw new LimitReached();
  if (row.application) return row.application;
  const [app] = await db.insert(applications).values({ userId: user.id, jobId, method }).onConflictDoNothing().returning();
  return app ?? (await getJob(db, user, jobId)).application!;
}

export async function listApplications(db: Db, user: User) {
  return db
    .select({ application: applications, job: jobs })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .where(eq(applications.userId, user.id))
    .orderBy(desc(applications.sentAt));
}

export async function setApplicationStatus(db: Db, user: User, applicationId: string, status: Application["status"]) {
  await db.update(applications).set({ status }).where(and(eq(applications.userId, user.id), eq(applications.id, applicationId)));
}

export async function markFollowedUp(db: Db, user: User, applicationId: string) {
  await db
    .update(applications)
    .set({ followedUpAt: new Date() })
    .where(and(eq(applications.userId, user.id), eq(applications.id, applicationId)));
}

/** Days after sending before we suggest a follow-up. */
export const FOLLOW_UP_DAYS = 5;

export function needsFollowUp(app: Application, now = new Date()): boolean {
  return app.status === "sent" && !app.followedUpAt && now.getTime() - app.sentAt.getTime() >= FOLLOW_UP_DAYS * 86400000;
}

export async function setPlan(db: Db, user: User, plan: User["plan"]) {
  await db.update(users).set({ plan }).where(eq(users.id, user.id));
}

/** Everything we hold about the user, for "Download my data" (PDPL right of access). */
export async function exportData(db: Db, user: User) {
  const [userJobs, userPacks, userApps, userConsents, userSubs] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.userId, user.id)),
    db.select().from(packs).where(eq(packs.userId, user.id)),
    db.select().from(applications).where(eq(applications.userId, user.id)),
    db.select().from(consents).where(eq(consents.userId, user.id)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    account: {
      phone: user.phone,
      addressForm: user.addressForm,
      lang: user.lang,
      plan: user.plan,
      createdAt: user.createdAt,
      preferences: user.preferences,
      notifications: user.notifications,
    },
    profile: user.profile,
    jobs: userJobs,
    packs: userPacks,
    applications: userApps,
    consents: userConsents,
    subscriptions: userSubs,
  };
}

/** Deletes the user and, through ON DELETE CASCADE, every row that belongs to them. */
export async function deleteAccount(db: Db, user: User) {
  await db.delete(users).where(eq(users.id, user.id));
}
