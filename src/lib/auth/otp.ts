import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { otpCodes, users } from "@/lib/db/schema";
import type { SmsSender } from "./sms";

export const CODE_TTL_MS = 5 * 60 * 1000;
export const MAX_CODES_PER_HOUR = 5;
export const MAX_ATTEMPTS = 5;

const hash = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}`).digest("hex");

export type RequestResult = { ok: true; devCode?: string } | { ok: false; reason: "rate_limited" };

/** Sends a fresh 4-digit code. At most 5 codes per number per hour. */
export async function requestCode(db: Db, phone: string, sms: SmsSender, now = new Date()): Promise<RequestResult> {
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recent = await db.select({ id: otpCodes.id }).from(otpCodes).where(and(eq(otpCodes.phone, phone), gte(otpCodes.createdAt, hourAgo)));
  if (recent.length >= MAX_CODES_PER_HOUR) return { ok: false, reason: "rate_limited" };

  const code = String(randomInt(0, 10000)).padStart(4, "0");
  await db.insert(otpCodes).values({ phone, codeHash: hash(phone, code), expiresAt: new Date(now.getTime() + CODE_TTL_MS), createdAt: now });
  await sms.send(phone, `رمز الدخول إلى وظيفة: ${code}\nYour Wadhifa code: ${code}`);
  return sms.name === "dev" ? { ok: true, devCode: code } : { ok: true };
}

export type VerifyResult = { ok: true; userId: string; isNew: boolean } | { ok: false; reason: "wrong" | "expired" | "too_many" };

/** Checks the latest code for this number. On success, finds or creates the user. */
export async function verifyCode(db: Db, phone: string, code: string, now = new Date()): Promise<VerifyResult> {
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.usedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!row || row.expiresAt <= now) return { ok: false, reason: "expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many" };

  const a = Buffer.from(row.codeHash, "hex");
  const b = Buffer.from(hash(phone, code.trim()), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db.update(otpCodes).set({ attempts: row.attempts + 1 }).where(eq(otpCodes.id, row.id));
    return { ok: false, reason: row.attempts + 1 >= MAX_ATTEMPTS ? "too_many" : "wrong" };
  }
  await db.update(otpCodes).set({ usedAt: now }).where(eq(otpCodes.id, row.id));

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
  if (existing) return { ok: true, userId: existing.id, isNew: false };
  const [created] = await db.insert(users).values({ phone }).onConflictDoNothing().returning({ id: users.id });
  if (created) return { ok: true, userId: created.id, isNew: true };
  const [raced] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
  return { ok: true, userId: raced.id, isNew: false };
}
