import type { CandidateProfile, CoverLetter, JobAnalysis, JobPosting, TailoredResume } from "../tailoring/schemas";
import { SAMPLE_PROFILE } from "../tailoring/sample";
import type { LlmProvider, StructuredRequest } from "./provider";

/**
 * A deterministic stand-in for a real model, so the app runs and the tests
 * pass without an API key. Its output is plausible but not tailored.
 */
export class MockProvider implements LlmProvider {
  readonly name = "mock";

  async generate<T>(request: StructuredRequest<T>): Promise<T> {
    const output = this.respond(request);
    return request.schema.parse(output);
  }

  private respond(request: StructuredRequest<unknown>): unknown {
    const input = request.input as Record<string, unknown>;
    switch (request.task) {
      case "extract_profile":
        return SAMPLE_PROFILE;
      case "analyze_job":
        return mockAnalysis(input.job as JobPosting);
      case "tailor_resume":
        return mockTailor(input.profile as CandidateProfile, input.analysis as JobAnalysis);
      case "write_cover_letter":
        return mockLetter(input.profile as CandidateProfile, input.job as JobPosting);
    }
  }
}

function linesAfter(description: string, heading: RegExp): string[] {
  const lines = description.split("\n");
  const start = lines.findIndex((l) => heading.test(l));
  if (start === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const item = line.replace(/^\s*[-*•]\s*/, "").trim();
    if (!item) {
      if (out.length > 0) break;
      continue;
    }
    if (/:\s*$/.test(item)) break;
    out.push(item);
  }
  return out;
}

function mockAnalysis(job: JobPosting): JobAnalysis {
  const mustHave = linesAfter(job.description, /requirements|qualifications/i);
  const niceToHave = linesAfter(job.description, /nice to have|preferred/i);
  return {
    title: job.title,
    company: job.company,
    seniority: /junior|graduate|entry/i.test(job.title) ? "junior" : "unknown",
    mustHave,
    niceToHave,
    keywords: [...mustHave, ...niceToHave].slice(0, 20),
    responsibilities: linesAfter(job.description, /responsibilities/i),
    companyContext: null,
  };
}

function mockTailor(profile: CandidateProfile, analysis: JobAnalysis): TailoredResume {
  const field = profile.education[0]?.field;
  return {
    headline: [field ? `${field} Graduate` : "Recent Graduate", analysis.title].join(" | "),
    summary: `Recent graduate applying for the ${analysis.title} role, with hands-on work in ${profile.skills
      .slice(0, 3)
      .join(", ")}.`,
    education: profile.education.map((e) => ({ id: e.id, bullets: e.highlights.slice(0, 3) })),
    experience: profile.experience.map((e) => ({ id: e.id, bullets: e.bullets.slice(0, 4) })),
    projects: profile.projects.map((p) => ({ id: p.id, bullets: p.bullets.slice(0, 4) })),
    certificationIds: profile.certifications.map((c) => c.id),
    skills: profile.skills.slice(0, 15),
    coverage: [],
    gaps: [],
    adviceAr: ["هذي نسخة تجريبية بدون ذكاء اصطناعي، فهي مو مفصّلة على الوظيفة بعد."],
  };
}

function mockLetter(profile: CandidateProfile, job: JobPosting): CoverLetter {
  const company = job.company ?? "your company";
  return {
    greeting: job.company ? `Dear Hiring Team at ${job.company},` : "Dear Hiring Team,",
    paragraphs: [
      `I am applying for the ${job.title} role at ${company}.`,
      `My background in ${profile.education[0]?.field ?? "my studies"} and my work with ${profile.skills
        .slice(0, 2)
        .join(" and ")} match what the role asks for.`,
      "I would welcome the chance to discuss how I can contribute to your team.",
    ],
    closing: "Kind regards,",
  };
}
