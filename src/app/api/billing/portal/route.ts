import { errorResponse } from "@/lib/api";
import { getBillingProvider, getBillingStore } from "@/lib/billing";
import { identify } from "@/lib/identity";

/** Link to manage the subscription (change card, cancel, invoices) on the provider's page. */
export async function POST(request: Request) {
  try {
    const identity = identify(request);
    const sub = await getBillingStore().getSubscription(identity.userRef);
    if (!sub) return Response.json({ error: "ما عندك اشتراك." }, { status: 404 });
    const { url } = await getBillingProvider().createPortalLink(sub.customerId);
    return Response.json({ url });
  } catch (error) {
    return errorResponse(error);
  }
}
