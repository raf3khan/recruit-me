import { freePacksPerMonth, getBillingStore, grantsPaidAccess, usageMonth, type BillingStore } from "./billing";
import { identify, type Identity } from "./identity";
import type { Tier } from "./llm";

/**
 * Which tier this request is served on, and how many free packs are left.
 *
 * Decided on the server only, never from anything the browser sends, so the
 * paywall can't be skipped. Paid = a subscription in a status that grants access
 * (active, trialing, or past_due while the card is retried).
 */
export interface Entitlement {
  identity: Identity;
  tier: Tier;
  packsUsed: number;
  /** null for paid users: no monthly cap. */
  packsLimit: number | null;
}

export async function entitlementFor(
  request: Request,
  env: Record<string, string | undefined> = process.env,
  store: BillingStore = getBillingStore(),
  now: Date = new Date(),
): Promise<Entitlement> {
  const identity = identify(request, env);
  const sub = await store.getSubscription(identity.userRef);
  const paid = sub !== null && grantsPaidAccess(sub.status);
  const packsUsed = await store.getUsage(identity.userRef, usageMonth(now));
  return { identity, tier: paid ? "paid" : "free", packsUsed, packsLimit: paid ? null : freePacksPerMonth(env) };
}

export function hasPacksLeft(e: Entitlement): boolean {
  return e.packsLimit === null || e.packsUsed < e.packsLimit;
}

/** Counts one tailored pack against this month's allowance. */
export async function recordPack(e: Entitlement, store: BillingStore = getBillingStore(), now: Date = new Date()) {
  await store.incrementUsage(e.identity.userRef, usageMonth(now));
}

