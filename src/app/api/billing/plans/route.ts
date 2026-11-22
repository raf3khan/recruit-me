import { errorResponse } from "@/lib/api";
import { getBillingProvider, plansFor } from "@/lib/billing";
import { withIdentity } from "@/lib/identity";
import { entitlementFor } from "@/lib/tier";

/** Plans on sale and where this visitor stands: tier, packs used, packs allowed. */
export async function GET(request: Request) {
  try {
    const provider = getBillingProvider();
    const e = await entitlementFor(request);
    const plans = plansFor(provider.name).map(({ id, interval, name, displayPrice }) => ({ id, interval, name, displayPrice }));
    return withIdentity(
      Response.json({ plans, tier: e.tier, packsUsed: e.packsUsed, packsLimit: e.packsLimit }),
      e.identity,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
