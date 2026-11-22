import { z } from "zod";
import { BadRequest, errorResponse, readJson } from "@/lib/api";
import { getProvider } from "@/lib/llm";
import { withIdentity } from "@/lib/identity";
import { entitlementFor } from "@/lib/tier";
import { extractProfile } from "@/lib/tailoring/pipeline";

const Body = z.object({ cvText: z.string() });

/** CV text (Arabic or English) -> structured profile for the candidate to check. */
export async function POST(request: Request) {
  try {
    const { cvText } = await readJson(request, Body);
    const text = cvText.trim();
    if (text.length < 50) throw new BadRequest("الصق نص سيرتك الذاتية كامل.");
    if (text.length > 30000) throw new BadRequest("النص طويل مرّة. اختصره لأقل من 30 ألف حرف.");
    const entitlement = await entitlementFor(request);
    const llm = getProvider(entitlement.tier);
    const profile = await extractProfile(llm, text);
    return withIdentity(Response.json({ profile, provider: llm.name }), entitlement.identity);
  } catch (error) {
    return errorResponse(error);
  }
}
