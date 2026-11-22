import { z } from "zod";
import { BadRequest, errorResponse, readJson } from "@/lib/api";
import { getProvider } from "@/lib/llm";
import { tierFor } from "@/lib/tier";
import { buildApplicationPack } from "@/lib/tailoring/pipeline";
import { AddressFormSchema, CandidateProfileSchema, JobPostingSchema } from "@/lib/tailoring/schemas";

const Body = z.object({ profile: CandidateProfileSchema, job: JobPostingSchema, address: AddressFormSchema.default("neutral") });

/** Profile + job -> tailored resume, cover letter, coverage and warnings. Nothing is sent anywhere. */
export async function POST(request: Request) {
  try {
    const { profile, job, address } = await readJson(request, Body);
    if (job.description.trim().length < 80) throw new BadRequest("الصق وصف الوظيفة كامل.");
    if (job.description.length > 20000) throw new BadRequest("وصف الوظيفة طويل مرّة.");
    const llm = getProvider(await tierFor(request));
    const pack = await buildApplicationPack(llm, profile, job, address);
    return Response.json({ ...pack, provider: llm.name });
  } catch (error) {
    return errorResponse(error);
  }
}
