import { z } from "zod";
import { BadRequest, errorResponse, PaymentRequired, readJson } from "@/lib/api";
import { withIdentity } from "@/lib/identity";
import { getProvider } from "@/lib/llm";
import { entitlementFor, hasPacksLeft, recordPack } from "@/lib/tier";
import { buildApplicationPack } from "@/lib/tailoring/pipeline";
import { AddressFormSchema, CandidateProfileSchema, JobPostingSchema } from "@/lib/tailoring/schemas";

const Body = z.object({ profile: CandidateProfileSchema, job: JobPostingSchema, address: AddressFormSchema.default("neutral") });

/** Profile + job -> tailored resume, cover letter, coverage and warnings. Nothing is sent anywhere. */
export async function POST(request: Request) {
  try {
    const { profile, job, address } = await readJson(request, Body);
    if (job.description.trim().length < 80) throw new BadRequest("الصق وصف الوظيفة كامل.");
    if (job.description.length > 20000) throw new BadRequest("وصف الوظيفة طويل مرّة.");
    const entitlement = await entitlementFor(request);
    if (!hasPacksLeft(entitlement)) {
      throw new PaymentRequired("خلصت باقاتك المجانية لهذا الشهر. اشترك عشان تكمل.");
    }
    const llm = getProvider(entitlement.tier);
    const pack = await buildApplicationPack(llm, profile, job, address);
    await recordPack(entitlement);
    return withIdentity(Response.json({ ...pack, provider: llm.name }), entitlement.identity);
  } catch (error) {
    return errorResponse(error);
  }
}
