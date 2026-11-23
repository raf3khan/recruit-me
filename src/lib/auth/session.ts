import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { sessions, users, type User } from "@/lib/db/schema";

export const SESSION_COOKIE = "wadhifa_session";
export const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a session and returns the raw token for the cookie. Only its hash is stored. */
export async function createSession(db: Db, userId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function userForToken(db: Db, token: string | undefined, now = new Date()): Promise<User | null> {
  if (!token) return null;
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)));
  return row?.user ?? null;
}

export async function deleteSession(db: Db, token: string | undefined) {
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
