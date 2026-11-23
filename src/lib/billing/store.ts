import { and, eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { subscriptions, users } from "@/lib/db/schema";
import { grantsPaidAccess, type SubscriptionEvent } from "./types";

/**
 * Applies a verified subscription event: saves the subscription and moves the
 * user to Plus or back to Free. Late or repeated events (same or older
 * occurred_at) are skipped. Returns false when skipped or the user is gone.
 */
export async function applySubscriptionEvent(db: Db, event: SubscriptionEvent): Promise<boolean> {
  const s = event.subscription;
  const at = new Date(event.occurredAt);
  return db.transaction(async (tx) => {
    const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, s.userRef));
    if (!user) return false;
    const [existing] = await tx
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.provider, s.provider), eq(subscriptions.subscriptionId, s.subscriptionId)));
    if (existing && existing.lastEventAt >= at) return false;
    const values = {
      userId: user.id,
      provider: s.provider,
      subscriptionId: s.subscriptionId,
      customerId: s.customerId,
      planId: s.planId,
      status: s.status,
      currentPeriodEnd: s.currentPeriodEnd ? new Date(s.currentPeriodEnd) : null,
      lastEventAt: at,
    };
    if (existing) await tx.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id));
    else await tx.insert(subscriptions).values(values);
    await tx
      .update(users)
      .set({ plan: grantsPaidAccess(s.status) ? "plus" : "free" })
      .where(eq(users.id, user.id));
    return true;
  });
}

/** The user's most recent subscription, for the "manage subscription" link. */
export async function latestSubscription(db: Db, userId: string) {
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  return rows.sort((a, b) => b.lastEventAt.getTime() - a.lastEventAt.getTime())[0] ?? null;
}
