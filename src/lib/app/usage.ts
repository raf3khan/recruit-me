import { and, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { packs, type User } from "@/lib/db/schema";

/** Packs (resume + letter) a free user can prepare each calendar month. Placeholder until pricing is set. */
export const FREE_MONTHLY_PACKS = 5;

/** Start of the current month in Riyadh time (UTC+3, no daylight saving), as a UTC instant. */
export function monthStart(now = new Date()): Date {
  const riyadh = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(riyadh.getUTCFullYear(), riyadh.getUTCMonth(), 1) - 3 * 60 * 60 * 1000);
}

export async function packsUsedThisMonth(db: Db, userId: string, now = new Date()): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(packs)
    .where(and(eq(packs.userId, userId), gte(packs.createdAt, monthStart(now))));
  return Number(row?.n ?? 0);
}

export interface Usage {
  plan: User["plan"];
  used: number;
  /** null means unlimited (Plus). */
  limit: number | null;
  left: number | null;
}

export async function usageFor(db: Db, user: Pick<User, "id" | "plan">, now = new Date()): Promise<Usage> {
  const used = await packsUsedThisMonth(db, user.id, now);
  if (user.plan === "plus") return { plan: "plus", used, limit: null, left: null };
  return { plan: "free", used, limit: FREE_MONTHLY_PACKS, left: Math.max(0, FREE_MONTHLY_PACKS - used) };
}
