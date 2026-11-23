import { applySubscriptionEvent, BillingError, getBillingProvider } from "@/lib/billing";
import { getDb } from "@/lib/db";

/**
 * Subscription events from the billing provider. The signature is checked against
 * the raw body, so the body is read as text and never re-serialised.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const event = await getBillingProvider().parseWebhook(rawBody, request.headers);
    if (event) {
      const applied = await applySubscriptionEvent(await getDb(), event);
      console.info(
        `[billing] ${event.subscription.subscriptionId} -> ${event.subscription.status}${applied ? "" : " (stale, duplicate or unknown user; skipped)"}`,
      );
    }
    return new Response(null, { status: 200 });
  } catch (error) {
    if (error instanceof BillingError && error.kind === "invalid_signature") {
      console.warn("[billing] rejected webhook:", error.message);
      return new Response(null, { status: 401 });
    }
    console.error("[billing] webhook failed:", error);
    // 500 makes the provider retry later.
    return new Response(null, { status: 500 });
  }
}
