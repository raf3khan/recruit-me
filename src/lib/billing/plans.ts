/**
 * Paid plans, all from the environment so pricing can change without a code change.
 *
 * PADDLE_PRICE_PLUS_MONTHLY        Paddle price id (pri_...) for Plus, monthly
 * PADDLE_PRICE_PLUS_YEARLY         Paddle price id for Plus, yearly (the plan is hidden without it)
 * PLAN_PLUS_MONTHLY_DISPLAY_PRICE  price shown on the plans page, e.g. "$12.99"
 * PLAN_PLUS_YEARLY_DISPLAY_PRICE   (Paddle's checkout always shows the real, localised price)
 *
 * The free allowance lives in src/lib/app/usage.ts.
 */

type Env = Record<string, string | undefined>;

export interface Plan {
  id: "plus_monthly" | "plus_yearly";
  interval: "month" | "year";
  displayPrice: string | null;
  /** Provider price ids by provider name. */
  priceIds: Record<string, string | undefined>;
}

export function allPlans(env: Env = process.env): Plan[] {
  return [
    {
      id: "plus_monthly",
      interval: "month",
      displayPrice: env.PLAN_PLUS_MONTHLY_DISPLAY_PRICE || null,
      priceIds: { paddle: env.PADDLE_PRICE_PLUS_MONTHLY, mock: "mock_plus_monthly" },
    },
    {
      id: "plus_yearly",
      interval: "year",
      displayPrice: env.PLAN_PLUS_YEARLY_DISPLAY_PRICE || null,
      priceIds: { paddle: env.PADDLE_PRICE_PLUS_YEARLY, mock: "mock_plus_yearly" },
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
