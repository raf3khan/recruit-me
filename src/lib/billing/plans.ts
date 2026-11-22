/**
 * Plans and limits, all from the environment so pricing can change without a code change.
 *
 * FREE_PACKS_PER_MONTH            tailored packs a free user gets each calendar month (default 5)
 * PADDLE_PRICE_PRO_MONTHLY        Paddle price id (pri_...) for the monthly plan
 * PADDLE_PRICE_PRO_YEARLY         Paddle price id for the yearly plan (optional; the plan is hidden without it)
 * PLAN_PRO_MONTHLY_DISPLAY_PRICE  price shown on our page, e.g. "49 SAR" (Paddle's checkout shows the real, localised price)
 * PLAN_PRO_YEARLY_DISPLAY_PRICE
 */

type Env = Record<string, string | undefined>;

export interface Plan {
  id: string;
  interval: "month" | "year";
  name: { ar: string; en: string };
  displayPrice: string | null;
  /** Provider price ids by provider name. */
  priceIds: Record<string, string | undefined>;
}

export const DEFAULT_FREE_PACKS_PER_MONTH = 5;

export function freePacksPerMonth(env: Env = process.env): number {
  const raw = env.FREE_PACKS_PER_MONTH;
  if (raw === undefined || raw === "") return DEFAULT_FREE_PACKS_PER_MONTH;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`FREE_PACKS_PER_MONTH must be a whole number, got "${raw}".`);
  return n;
}

export function allPlans(env: Env = process.env): Plan[] {
  return [
    {
      id: "pro_monthly",
      interval: "month",
      name: { ar: "الاشتراك الشهري", en: "Monthly" },
      displayPrice: env.PLAN_PRO_MONTHLY_DISPLAY_PRICE || null,
      priceIds: { paddle: env.PADDLE_PRICE_PRO_MONTHLY, mock: "mock_pro_monthly" },
    },
    {
      id: "pro_yearly",
      interval: "year",
      name: { ar: "الاشتراك السنوي", en: "Yearly" },
      displayPrice: env.PLAN_PRO_YEARLY_DISPLAY_PRICE || null,
      priceIds: { paddle: env.PADDLE_PRICE_PRO_YEARLY, mock: "mock_pro_yearly" },
    },
  ];
}

/** Plans that can be bought with this provider: those with a price id configured. */
export function plansFor(provider: string, env: Env = process.env): Plan[] {
  return allPlans(env).filter((p) => Boolean(p.priceIds[provider]));
}

export function planByPriceId(provider: string, priceId: string, env: Env = process.env): Plan | undefined {
  return allPlans(env).find((p) => p.priceIds[provider] === priceId);
}
