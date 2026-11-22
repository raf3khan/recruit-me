import { z } from "zod";
import { BillingError } from "./billing";
import { LlmError } from "./llm";

/** Shared helpers for the route handlers. Error messages are shown to candidates, so they are in Arabic. */

export class BadRequest extends Error {}

/** The free allowance is used up; the client shows the upgrade offer. */
export class PaymentRequired extends Error {}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequest("الطلب ما وصل بشكل صحيح.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequest(`البيانات ناقصة أو غير صحيحة: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }
  return parsed.data;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof BadRequest) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof PaymentRequired) {
    return Response.json({ error: error.message, code: "upgrade_required" }, { status: 402 });
  }
  if (error instanceof BillingError) {
    console.error(`[billing:${error.kind}]`, error.message);
    const status = error.kind === "invalid_signature" ? 401 : error.kind === "unknown_plan" ? 400 : 502;
    const message = error.kind === "unknown_plan" ? "الباقة غير متوفرة." : "ما قدرنا نفتح صفحة الدفع. جرّب بعد شوي.";
    return Response.json({ error: message }, { status });
  }
  if (error instanceof LlmError) {
    console.error(`[llm:${error.kind}]`, error.message);
    const message =
      error.kind === "refusal"
        ? "ما قدرنا نجهّز هذا الطلب. راجع النص وجرّب مرة ثانية."
        : "صار خلل مؤقت في التجهيز. جرّب بعد شوي.";
    return Response.json({ error: message }, { status: 502 });
  }
  console.error(error);
  return Response.json({ error: "صار خطأ غير متوقع. جرّب مرة ثانية." }, { status: 500 });
}
