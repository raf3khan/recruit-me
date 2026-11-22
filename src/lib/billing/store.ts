import type { Subscription } from "./types";

/**
 * Where subscriptions and monthly usage live.
 *
 * There is no database yet, so the default keeps everything in memory: fine for
 * local testing and the sandbox, but it is lost on restart and not shared between
 * server instances. Swap in a database-backed store (Saudi-region storage, per
 * the PDPL notes) before taking real payments.
 */
export interface BillingStore {
  getSubscription(userRef: string): Promise<Subscription | null>;
  /** Saves the event unless a newer one for the same subscription was already applied. Returns false for stale or duplicate events. */
  applySubscription(sub: Subscription, eventId: string): Promise<boolean>;
  getUsage(userRef: string, month: string): Promise<number>;
  incrementUsage(userRef: string, month: string): Promise<number>;
}

export class MemoryBillingStore implements BillingStore {
  private subs = new Map<string, Subscription>();
  private seenEvents = new Set<string>();
  private usage = new Map<string, number>();

  async getSubscription(userRef: string) {
    return this.subs.get(userRef) ?? null;
  }

  async applySubscription(sub: Subscription, eventId: string) {
    if (eventId && this.seenEvents.has(eventId)) return false;
    const existing = this.subs.get(sub.userRef);
    if (existing && existing.subscriptionId === sub.subscriptionId && existing.updatedAt > sub.updatedAt) return false;
    if (eventId) this.seenEvents.add(eventId);
    this.subs.set(sub.userRef, sub);
    return true;
  }

  async getUsage(userRef: string, month: string) {
    return this.usage.get(`${userRef}:${month}`) ?? 0;
  }

  async incrementUsage(userRef: string, month: string) {
    const key = `${userRef}:${month}`;
    const next = (this.usage.get(key) ?? 0) + 1;
    this.usage.set(key, next);
    return next;
  }
}

/** Calendar month in Riyadh time (UTC+3, no DST), e.g. "2026-11". */
export function usageMonth(now: Date = new Date()): string {
  return new Date(now.getTime() + 3 * 3600_000).toISOString().slice(0, 7);
}
