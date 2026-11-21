import type { LlmProvider } from "../llm/provider";
import { assembleResume, assignIds, checkCoverLetter, type ResumeDocument, type Warning } from "./assemble";
import {
  ANALYZE_JOB_SYSTEM,
  COVER_LETTER_SYSTEM,
  EXTRACT_PROFILE_SYSTEM,
  TAILOR_RESUME_SYSTEM,
  analyzeJobPrompt,
  coverLetterPrompt,
  extractProfilePrompt,
  tailorResumePrompt,
} from "./prompts";
import {
  CandidateProfileSchema,
  CoverLetterSchema,
  JobAnalysisSchema,
  TailoredResumeSchema,
  type CandidateProfile,
  type CoverLetter,
  type JobAnalysis,
  type JobPosting,
  type TailoredResume,
} from "./schemas";

/** CV text (Arabic or English) -> structured English profile with stable ids. */
export async function extractProfile(llm: LlmProvider, cvText: string): Promise<CandidateProfile> {
  const profile = await llm.generate({
    task: "extract_profile",
    system: EXTRACT_PROFILE_SYSTEM,
    prompt: extractProfilePrompt(cvText),
    schema: CandidateProfileSchema,
    input: { cvText },
    effort: "low",
  });
  return assignIds(profile);
}

export async function analyzeJob(llm: LlmProvider, job: JobPosting): Promise<JobAnalysis> {
  return llm.generate({
    task: "analyze_job",
    system: ANALYZE_JOB_SYSTEM,
    prompt: analyzeJobPrompt(job),
    schema: JobAnalysisSchema,
    input: { job },
    effort: "low",
  });
}

export async function tailorResume(
  llm: LlmProvider,
  profile: CandidateProfile,
  analysis: JobAnalysis,
  job: JobPosting,
): Promise<TailoredResume> {
  return llm.generate({
    task: "tailor_resume",
    system: TAILOR_RESUME_SYSTEM,
    prompt: tailorResumePrompt(profile, analysis, job),
    schema: TailoredResumeSchema,
    input: { profile, analysis, job },
    effort: "medium",
  });
}

export async function writeCoverLetter(
  llm: LlmProvider,
  profile: CandidateProfile,
  analysis: JobAnalysis,
  tailored: TailoredResume,
  job: JobPosting,
): Promise<CoverLetter> {
  return llm.generate({
    task: "write_cover_letter",
    system: COVER_LETTER_SYSTEM,
    prompt: coverLetterPrompt(profile, analysis, tailored, job),
    schema: CoverLetterSchema,
    input: { profile, analysis, tailored, job },
    effort: "medium",
  });
}

export interface ApplicationPack {
  job: JobPosting;
  analysis: JobAnalysis;
  resume: ResumeDocument;
  coverLetter: CoverLetter;
  coverage: TailoredResume["coverage"];
  gaps: string[];
  adviceAr: string[];
  warnings: Warning[];
}

/**
 * The whole step-2 flow for one job: read the job, tailor the resume, write
 * the cover letter, and run the deterministic checks. Nothing is sent
 * anywhere; the candidate reviews and decides what to do with the pack.
 */
export async function buildApplicationPack(
  llm: LlmProvider,
  rawProfile: CandidateProfile,
  job: JobPosting,
): Promise<ApplicationPack> {
  const profile = assignIds(rawProfile);
  const analysis = await analyzeJob(llm, job);
  const tailored = await tailorResume(llm, profile, analysis, job);
  const coverLetter = await writeCoverLetter(llm, profile, analysis, tailored, job);

  const { document, warnings } = assembleResume(profile, tailored);
  warnings.push(...checkCoverLetter(profile, coverLetter));

  return {
    job,
    analysis,
    resume: document,
    coverLetter,
    coverage: tailored.coverage,
    gaps: tailored.gaps,
    adviceAr: tailored.adviceAr,
    warnings,
  };
}
