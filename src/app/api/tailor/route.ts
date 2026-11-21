import { z } from "zod";
import { BadRequest, errorResponse, readJson } from "@/lib/api";
import { getProvider } from "@/lib/llm";
import { buildApplicationPack } from "@/lib/tailoring/pipeline";
import { CandidateProfileSchema, JobPostingSchema } from "@/lib/tailoring/schemas";

const Body = z.object({ profile: CandidateProfileSchema, job: JobPostingSchema });

/** Profile + job -> tailored resume, cover letter, coverage and warnings. Nothing is sent anywhere. */
export async function POST(request: Request) {
  try {
    const { profile, job } = await readJson(request, Body);
    if (job.description.trim().length < 80) throw new BadRequest("الصق وصف الوظيفة كامل.");
    if (job.description.length > 20000) throw new BadRequest("وصف الوظيفة طويل مرّة.");
    const llm = getProvider();
    const pack = await buildApplicationPack(llm, profile, job);
    return Response.json({ ...pack, provider: llm.name });
  } catch (error) {
    return errorResponse(error);
  }
}
