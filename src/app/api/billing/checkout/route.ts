import { z } from "zod";
import { errorResponse, readJson } from "@/lib/api";
import { BillingError, getBillingProvider, plansFor } from "@/lib/billing";
import { identify, withIdentity } from "@/lib/identity";

const Body = z.object({ planId: z.string(), locale: z.enum(["ar", "en"]).default("ar") });

/** Starts a checkout for one plan and returns the URL to open. */
export async function POST(request: Request) {
  try {
    const { planId, locale } = await readJson(request, Body);
    const provider = getBillingProvider();
    const plan = plansFor(provider.name).find((p) => p.id === planId);
    const priceId = plan?.priceIds[provider.name];
    if (!plan || !priceId) throw new BillingError("unknown_plan", `No ${provider.name} price for plan "${planId}".`);
    const identity = identify(request);
    const { url } = await provider.createCheckout({ userRef: identity.userRef, planId, priceId, locale });
    return withIdentity(Response.json({ url }), identity);
  } catch (error) {
    return errorResponse(error);
  }
}
