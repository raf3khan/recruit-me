import { describe, expect, it } from "vitest";
import { getProvider } from "@/lib/llm";
import { MockProvider } from "@/lib/llm/mock";
import type { LlmProvider, StructuredRequest } from "@/lib/llm/provider";
import { coverLetterToDocx, coverLetterToText, resumeToDocx, resumeToText } from "@/lib/render/docx";
import { buildApplicationPack, extractProfile } from "@/lib/tailoring/pipeline";
import { SAMPLE_JOB, SAMPLE_PROFILE } from "@/lib/tailoring/sample";

describe("getProvider", () => {
  it("uses the mock without an API key", () => {
    expect(getProvider({}).name).toBe("mock");
  });
  it("uses Claude when a key is set", () => {
    expect(getProvider({ ANTHROPIC_API_KEY: "test" }).name).toBe("anthropic");
  });
  it("lets LLM_PROVIDER override", () => {
    expect(getProvider({ ANTHROPIC_API_KEY: "test", LLM_PROVIDER: "mock" }).name).toBe("mock");
    expect(() => getProvider({ LLM_PROVIDER: "nope" })).toThrow(/Unknown LLM_PROVIDER/);
  });
});

describe("buildApplicationPack", () => {
  it("runs every step in order and returns a reviewed pack", async () => {
    const calls: string[] = [];
    const mock = new MockProvider();
    const recording: LlmProvider = {
      name: "recording",
      generate<T>(request: StructuredRequest<T>) {
        calls.push(request.task);
        return mock.generate(request);
      },
    };

    const pack = await buildApplicationPack(recording, SAMPLE_PROFILE, SAMPLE_JOB);

    expect(calls).toEqual(["analyze_job", "tailor_resume", "write_cover_letter"]);
    expect(pack.analysis.mustHave).toContain("Strong SQL skills");
    expect(pack.resume.fullName).toBe(SAMPLE_PROFILE.fullName);
    expect(pack.coverLetter.greeting).toBe("Dear Hiring Team at Tamara,");
    expect(pack.warnings).toEqual([]);
  });

  it("puts the profile and job in the prompts", async () => {
    const prompts: string[] = [];
    const mock = new MockProvider();
    await buildApplicationPack(
      { name: "spy", generate: (r) => (prompts.push(r.prompt), mock.generate(r)) },
      SAMPLE_PROFILE,
      SAMPLE_JOB,
    );
    expect(prompts[1]).toContain("King Saud University");
    expect(prompts[1]).toContain("Junior Data Analyst");
    expect(prompts[2]).toContain("<tailored_resume>");
  });
});

describe("extractProfile", () => {
  it("assigns ids after extraction", async () => {
    const profile = await extractProfile(new MockProvider(), "any cv text");
    expect(profile.education[0].id).toBe("edu-0");
    expect(profile.projects[0].id).toBe("proj-0");
  });
});

describe("renderers", () => {
  it("produces Word files and plain text", async () => {
    const pack = await buildApplicationPack(new MockProvider(), SAMPLE_PROFILE, SAMPLE_JOB);
    const resume = await resumeToDocx(pack.resume);
    const letter = await coverLetterToDocx(pack.coverLetter, pack.resume.fullName);
    // .docx files are zip archives
    expect(resume.subarray(0, 2).toString()).toBe("PK");
    expect(letter.subarray(0, 2).toString()).toBe("PK");

    const text = resumeToText(pack.resume);
    expect(text).toContain("EXPERIENCE");
    expect(text).toContain("Data Analytics Co-op Trainee, Saudi Telecom Company (stc) (Jan 2025 – Jun 2025)");
    expect(coverLetterToText(pack.coverLetter, "Noura")).toMatch(/Kind regards,\nNoura$/);
  });
});
