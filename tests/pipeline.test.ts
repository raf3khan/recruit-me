import { describe, expect, it } from "vitest";
import { getProvider } from "@/lib/llm";
import { MockProvider } from "@/lib/llm/mock";
import type { LlmProvider, StructuredRequest } from "@/lib/llm/provider";
import { coverLetterToDocx, coverLetterToText, resumeToDocx, resumeToText } from "@/lib/render/docx";
import { buildApplicationPack, extractProfile } from "@/lib/tailoring/pipeline";
import { SAMPLE_JOB, SAMPLE_PROFILE } from "@/lib/tailoring/sample";

describe("getProvider", () => {
  it("uses the mock without an API key", () => {
    expect(getProvider("free", {}).name).toBe("mock");
  });
  it("uses Haiku for free users and Sonnet for paid users by default", () => {
    const env = { ANTHROPIC_API_KEY: "test" };
    expect(getProvider("free", env)).toMatchObject({ name: "anthropic", model: "claude-haiku-5-5" });
    expect(getProvider("paid", env)).toMatchObject({ name: "anthropic", model: "claude-sonnet-5-5" });
  });
  it("lets the environment override each tier's model", () => {
    const env = { ANTHROPIC_API_KEY: "test", ANTHROPIC_MODEL_FREE: "claude-sonnet-5-5", ANTHROPIC_MODEL_PAID: "claude-opus-5-5" };
    expect(getProvider("free", env)).toMatchObject({ model: "claude-sonnet-5-5" });
    expect(getProvider("paid", env)).toMatchObject({ model: "claude-opus-5-5" });
  });
  it("lets LLM_PROVIDER override", () => {
    expect(getProvider("free", { ANTHROPIC_API_KEY: "test", LLM_PROVIDER: "mock" }).name).toBe("mock");
    expect(() => getProvider("free", { LLM_PROVIDER: "nope" })).toThrow(/Unknown LLM_PROVIDER/);
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

describe("address form", () => {
  async function tailorPrompt(address?: "masculine" | "feminine" | "neutral") {
    const prompts: string[] = [];
    const mock = new MockProvider();
    await buildApplicationPack(
      { name: "spy", generate: (r) => (prompts.push(r.prompt), mock.generate(r)) },
      SAMPLE_PROFILE,
      SAMPLE_JOB,
      address,
    );
    return prompts[1];
  }

  it("tells the model how to address the candidate", async () => {
    expect(await tailorPrompt("feminine")).toContain("أنتِ");
    expect(await tailorPrompt("masculine")).toMatch(/masculine: speak to the candidate as أنت,/);
  });

  it("falls back to neutral wording when the form is unknown", async () => {
    expect(await tailorPrompt()).toContain("neutral: we don't know");
  });
});
