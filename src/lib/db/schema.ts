import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { CandidateProfile, CoverLetter } from "@/lib/tailoring/schemas";
import type { ApplicationPack } from "@/lib/tailoring/pipeline";

/**
 * Database tables. Postgres in production (DATABASE_URL), an embedded
 * Postgres (PGlite) on disk in development and in memory in tests.
 *
 * Personal data lives in `users.profile` (the CV facts) and `users.phone`.
 * Deleting a user deletes everything else through ON DELETE CASCADE.
 */

export const addressForm = pgEnum("address_form", ["masculine", "feminine", "neutral"]);
export const plan = pgEnum("plan", ["free", "plus"]);
export const lang = pgEnum("lang", ["ar", "en"]);
export const jobSource = pgEnum("job_source", ["manual", "sample", "feed"]);
export const sendMethod = pgEnum("send_method", ["site", "email", "word"]);
export const applicationStatus = pgEnum("application_status", ["sent", "reply", "interview", "offer", "closed"]);

export interface Preferences {
  roles: string[];
  cities: string[];
  sectors: string[];
  workType: "full" | "grad" | "intern";
}

export interface Notifications {
  daily: boolean;
  followUp: boolean;
  weekly: boolean;
}

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    addressForm: addressForm("address_form").notNull().default("neutral"),
    lang: lang("lang").notNull().default("ar"),
    plan: plan("plan").notNull().default("free"),
    profile: jsonb("profile").$type<CandidateProfile>(),
    preferences: jsonb("preferences").$type<Preferences>(),
    notifications: jsonb("notifications")
      .$type<Notifications>()
      .notNull()
      .default({ daily: true, followUp: true, weekly: false }),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_phone_idx").on(t.phone)],
);

/** One row per code sent. Only the hash of the code is stored. */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    usedAt: timestamp("used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("otp_phone_idx").on(t.phone, t.createdAt)],
);

/** The cookie holds a random token; only its SHA-256 is stored here. */
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Consent records (PDPL): what the user agreed to, which version, and when. */
export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  version: text("version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    company: text("company"),
    location: text("location"),
    description: text("description").notNull(),
    url: text("url"),
    source: jobSource("source").notNull().default("manual"),
    fit: integer("fit").notNull().default(1),
    skipped: boolean("skipped").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jobs_user_idx").on(t.userId, t.createdAt)],
);

/** A prepared resume + letter for one job. Counts toward the monthly allowance. */
export const packs = pgTable(
  "packs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    pack: jsonb("pack").$type<Omit<ApplicationPack, "job">>().notNull(),
    letter: jsonb("letter").$type<CoverLetter>().notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("packs_job_idx").on(t.jobId), index("packs_user_month_idx").on(t.userId, t.createdAt)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    method: sendMethod("method").notNull(),
    status: applicationStatus("status").notNull().default("sent"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    followedUpAt: timestamp("followed_up_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("applications_job_idx").on(t.jobId), index("applications_user_idx").on(t.userId, t.sentAt)],
);

export type User = typeof users.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Pack = typeof packs.$inferSelect;
export type Application = typeof applications.$inferSelect;

