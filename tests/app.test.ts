import { beforeEach, describe, expect, it } from "vitest";
import { requestCode, verifyCode, MAX_CODES_PER_HOUR } from "@/lib/auth/otp";
import { normalizePhone } from "@/lib/auth/phone";
import { createSession, deleteSession, userForToken } from "@/lib/auth/session";
import type { SmsSender } from "@/lib/auth/sms";
import { fitLevel } from "@/lib/app/fit";
import * as service from "@/lib/app/service";
import { FREE_MONTHLY_PACKS, monthStart, usageFor } from "@/lib/app/usage";
import { openDb, type Db } from "@/lib/db";
import { applications, jobs, packs, users, type User } from "@/lib/db/schema";
import { countAr, daysAgo, translator } from "@/lib/i18n";
import { MockProvider } from "@/lib/llm/mock";
import { SAMPLE_JOB, SAMPLE_PROFILE } from "@/lib/tailoring/sample";
import { eq } from "drizzle-orm";

class CapturingSms implements SmsSender {
  readonly name = "test";
  sent: { phone: string; text: string }[] = [];
  async send(phone: string, text: string) {
    this.sent.push({ phone, text });
  }
  lastCode() {
    return this.sent.at(-1)!.text.match(/\d{4}/)![0];
  }
}

let db: Db;
beforeEach(async () => {
  db = await openDb("memory");
});

async function signUp(phone = "+966551234567"): Promise<User> {
  const sms = new CapturingSms();
  await requestCode(db, phone, sms);
  const result = await verifyCode(db, phone, sms.lastCode());
  if (!result.ok) throw new Error("sign-up failed");
  const [user] = await db.select().from(users).where(eq(users.id, result.userId));
  return user;
}

async function onboarded(phone?: string): Promise<User> {
  const user = await signUp(phone);
  await service.saveProfile(db, user, SAMPLE_PROFILE);
  await service.setAddressForm(db, user, "feminine");
  const [fresh] = await db.select().from(users).where(eq(users.id, user.id));
  return fresh;
}

describe("normalizePhone", () => {
  it("accepts Saudi numbers in the usual ways", () => {
    for (const v of ["0551234567", "551234567", "+966 55 123 4567", "00966551234567", "٠٥٥١٢٣٤٥٦٧"]) {
      expect(normalizePhone(v)).toBe("+966551234567");
    }
  });
  it("accepts other GCC numbers with their country code", () => {
    expect(normalizePhone("+971 50 123 4567")).toBe("+971501234567");
    expect(normalizePhone("+965 5123 4567")).toBe("+96551234567");
  });
  it("rejects landlines, short numbers and other countries", () => {
    expect(normalizePhone("0112345678")).toBeNull();
    expect(normalizePhone("05512")).toBeNull();
    expect(normalizePhone("+44 7700 900123")).toBeNull();
  });
});

describe("sign-in codes", () => {
  it("creates the user on the first correct code and finds them the next time", async () => {
    const sms = new CapturingSms();
    await requestCode(db, "+966551234567", sms);
    const first = await verifyCode(db, "+966551234567", sms.lastCode());
    expect(first).toMatchObject({ ok: true, isNew: true });
    await requestCode(db, "+966551234567", sms);
    const second = await verifyCode(db, "+966551234567", sms.lastCode());
    expect(second).toMatchObject({ ok: true, isNew: false });
    if (first.ok && second.ok) expect(second.userId).toBe(first.userId);
  });

  it("rejects a wrong code, then locks after too many tries", async () => {
    const sms = new CapturingSms();
    await requestCode(db, "+966551234567", sms);
    const wrong = sms.lastCode() === "0000" ? "1111" : "0000";
    expect(await verifyCode(db, "+966551234567", wrong)).toEqual({ ok: false, reason: "wrong" });
    for (let i = 0; i < 3; i++) await verifyCode(db, "+966551234567", wrong);
    expect(await verifyCode(db, "+966551234567", wrong)).toEqual({ ok: false, reason: "too_many" });
    expect(await verifyCode(db, "+966551234567", sms.lastCode())).toEqual({ ok: false, reason: "too_many" });
  });

  it("rejects an expired or reused code", async () => {
    const sms = new CapturingSms();
    await requestCode(db, "+966551234567", sms, new Date(Date.now() - 10 * 60 * 1000));
    expect(await verifyCode(db, "+966551234567", sms.lastCode())).toEqual({ ok: false, reason: "expired" });
    await requestCode(db, "+966551234567", sms);
    const code = sms.lastCode();
    expect((await verifyCode(db, "+966551234567", code)).ok).toBe(true);
    expect((await verifyCode(db, "+966551234567", code)).ok).toBe(false);
  });

  it("limits how many codes a number can ask for", async () => {
    const sms = new CapturingSms();
    for (let i = 0; i < MAX_CODES_PER_HOUR; i++) expect((await requestCode(db, "+966551234567", sms)).ok).toBe(true);
    expect(await requestCode(db, "+966551234567", sms)).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("only returns the code to the page for the development sender", async () => {
    expect(await requestCode(db, "+966551234567", new CapturingSms())).toEqual({ ok: true });
  });
});

describe("sessions", () => {
  it("finds the user by token, and not after logout or expiry", async () => {
    const user = await signUp();
    const { token } = await createSession(db, user.id);
    expect((await userForToken(db, token))?.id).toBe(user.id);
    expect(await userForToken(db, "not-a-token")).toBeNull();
    expect(await userForToken(db, token, new Date(Date.now() + 31 * 86400000))).toBeNull();
    await deleteSession(db, token);
    expect(await userForToken(db, token)).toBeNull();
  });
});

describe("packs and the free limit", () => {
  it("prepares a pack once and counts it toward the month", async () => {
    const user = await onboarded();
    const job = await service.addJob(db, user, SAMPLE_JOB);
    const pack = await service.prepareJob(db, user, job.id, new MockProvider());
    expect(pack.pack.resume.fullName).toBe(SAMPLE_PROFILE.fullName);
    const again = await service.prepareJob(db, user, job.id, new MockProvider());
    expect(again.id).toBe(pack.id);
    expect((await usageFor(db, user)).used).toBe(1);
  });

  it("stops free users at the monthly limit and lets Plus users through", async () => {
    const user = await onboarded();
    for (let i = 0; i < FREE_MONTHLY_PACKS; i++) {
      const job = await service.addJob(db, user, SAMPLE_JOB);
      await service.prepareJob(db, user, job.id, new MockProvider());
    }
    const extra = await service.addJob(db, user, SAMPLE_JOB);
    await expect(service.prepareJob(db, user, extra.id, new MockProvider())).rejects.toBeInstanceOf(service.LimitReached);
    await service.setPlan(db, user, "plus");
    const plus = { ...user, plan: "plus" as const };
    await expect(service.prepareJob(db, plus, extra.id, new MockProvider())).resolves.toBeTruthy();
  });

  it("resets the count at the start of the month in Riyadh time", () => {
    // 21:30 UTC on Nov 30 is already Dec 1 in Riyadh.
    expect(monthStart(new Date("2026-11-30T21:30:00Z")).toISOString()).toBe("2026-11-30T21:00:00.000Z");
    expect(monthStart(new Date("2026-11-30T20:30:00Z")).toISOString()).toBe("2026-10-31T21:00:00.000Z");
  });

  it("passes the user's form of address to the tips prompt", async () => {
    const user = await onboarded();
    const job = await service.addJob(db, user, SAMPLE_JOB);
    const prompts: string[] = [];
    const mock = new MockProvider();
    await service.prepareJob(db, user, job.id, { name: "spy", generate: (r) => (prompts.push(r.prompt), mock.generate(r)) });
    expect(prompts.some((p) => p.includes("أنتِ"))).toBe(true);
  });
});

describe("sending and privacy", () => {
  it("records a send only after preparing, and email needs Plus", async () => {
    const user = await onboarded();
    const job = await service.addJob(db, user, SAMPLE_JOB);
    await expect(service.markSent(db, user, job.id, "site")).rejects.toThrow("not_prepared");
    await service.prepareJob(db, user, job.id, new MockProvider());
    await expect(service.markSent(db, user, job.id, "email")).rejects.toBeInstanceOf(service.LimitReached);
    const app = await service.markSent(db, user, job.id, "word");
    expect(app.status).toBe("sent");
    expect(service.needsFollowUp(app)).toBe(false);
    expect(service.needsFollowUp(app, new Date(Date.now() + 6 * 86400000))).toBe(true);
  });

  it("never shows one user's jobs to another", async () => {
    const a = await onboarded("+966551111111");
    const b = await onboarded("+966552222222");
    const job = await service.addJob(db, a, SAMPLE_JOB);
    expect(await service.listJobs(db, b)).toEqual([]);
    await expect(service.getJob(db, b, job.id)).rejects.toBeInstanceOf(service.NotFound);
    await expect(service.prepareJob(db, b, job.id, new MockProvider())).rejects.toBeInstanceOf(service.NotFound);
    await service.skipJob(db, b, job.id);
    expect((await service.listJobs(db, a)).length).toBe(1);
  });

  it("exports everything and deletes everything", async () => {
    const user = await onboarded();
    const job = await service.addJob(db, user, SAMPLE_JOB);
    await service.prepareJob(db, user, job.id, new MockProvider());
    await service.markSent(db, user, job.id, "site");
    await service.recordConsent(db, user.id);
    const data = await service.exportData(db, user);
    expect(data.account.phone).toBe(user.phone);
    expect(data.jobs).toHaveLength(1);
    expect(data.packs).toHaveLength(1);
    expect(data.applications).toHaveLength(1);
    expect(data.consents.length).toBeGreaterThan(0);

    await service.deleteAccount(db, user);
    for (const table of [users, jobs, packs, applications]) expect(await db.select().from(table)).toEqual([]);
  });
});

describe("copy helpers", () => {
  it("counts Arabic nouns with the right form", () => {
    const f = (n: number) => countAr(n, "يوم", "يومين", "أيام", "يوم");
    expect([1, 2, 3, 10, 11, 14, 103].map(f)).toEqual(["يوم", "يومين", "3 أيام", "10 أيام", "11 يوم", "14 يوم", "103 أيام"]);
    expect(daysAgo("ar", new Date(Date.now() - 6 * 86400000))).toBe("قبل 6 أيام");
    expect(daysAgo("en", new Date(Date.now() - 86400000))).toBe("Yesterday");
  });

  it("picks the feminine line only for users who chose it", () => {
    expect(translator("ar", "feminine")("Send", "أرسل", "أرسلي")).toBe("أرسلي");
    expect(translator("ar", "masculine")("Send", "أرسل", "أرسلي")).toBe("أرسل");
    expect(translator("en", "feminine")("Send", "أرسل", "أرسلي")).toBe("Send");
  });

  it("rates fit from the profile's skills", () => {
    expect(fitLevel(SAMPLE_PROFILE, SAMPLE_JOB.description)).toBe(2);
    expect(fitLevel(SAMPLE_PROFILE, "Forklift driver with a heavy vehicle licence. Night shifts.")).toBe(0);
  });
});

describe("test mode", () => {
  it("is on in development and only on by choice in production", async () => {
    const { isTestMode, isHostedTest } = await import("@/lib/mode");
    expect(isTestMode({ NODE_ENV: "development" })).toBe(true);
    expect(isTestMode({ NODE_ENV: "production" })).toBe(false);
    expect(isTestMode({ NODE_ENV: "production", TEST_MODE: "on" })).toBe(true);
    expect(isHostedTest({ NODE_ENV: "development", TEST_MODE: "on" })).toBe(false);
    expect(isHostedTest({ NODE_ENV: "production", TEST_MODE: "on" })).toBe(true);
  });
});
