import { describe, expect, it } from "vitest";
import { assembleResume, assignIds, checkCoverLetter, numbersIn } from "@/lib/tailoring/assemble";
import { SAMPLE_PROFILE } from "@/lib/tailoring/sample";
import type { TailoredResume } from "@/lib/tailoring/schemas";

function tailored(overrides: Partial<TailoredResume> = {}): TailoredResume {
  return {
    headline: "Information Systems Graduate | Data Analysis",
    summary: "Information Systems graduate with co-op experience building Power BI dashboards.",
    education: [{ id: "edu-0", bullets: ["Graduated with Second Class Honours"] }],
    experience: [{ id: "exp-0", bullets: ["Built Power BI dashboards tracking weekly complaint volumes"] }],
    projects: [{ id: "proj-0", bullets: ["Reached 78% accuracy predicting appointment no-shows"] }],
    certificationIds: ["cert-0"],
    skills: ["SQL", "Power BI"],
    coverage: [],
    gaps: [],
    adviceAr: [],
    ...overrides,
  };
}

describe("numbersIn", () => {
  it("normalises thousands separators", () => {
    expect(numbersIn("12,000 records, 78% and 4.52/5")).toEqual(["12000", "78", "4.52", "5"]);
  });
});

describe("assignIds", () => {
  it("numbers items by section", () => {
    const profile = assignIds({ ...SAMPLE_PROFILE, experience: SAMPLE_PROFILE.experience.map((e) => ({ ...e, id: "" })) });
    expect(profile.experience.map((e) => e.id)).toEqual(["exp-0", "exp-1"]);
  });
});

describe("assembleResume", () => {
  it("copies facts from the profile, not from the model", () => {
    const { document, warnings } = assembleResume(SAMPLE_PROFILE, tailored());
    expect(warnings).toEqual([]);
    expect(document.fullName).toBe("Noura Al-Harbi");
    expect(document.experience[0].organization).toBe("Saudi Telecom Company (stc)");
    expect(document.experience[0].startDate).toBe("Jan 2025");
    expect(document.experience[0].bullets).toEqual(["Built Power BI dashboards tracking weekly complaint volumes"]);
    expect(document.certifications.map((c) => c.name)).toEqual(["Google Data Analytics Certificate"]);
    expect(document.contact.location).toBe("Riyadh, Saudi Arabia");
  });

  it("drops items with unknown ids and keeps the model's order", () => {
    const { document, warnings } = assembleResume(
      SAMPLE_PROFILE,
      tailored({ experience: [{ id: "exp-1", bullets: ["Guided visitors"] }, { id: "exp-9", bullets: ["Invented job"] }, { id: "exp-0", bullets: [] }] }),
    );
    expect(document.experience.map((e) => e.id)).toEqual(["exp-1", "exp-0"]);
    expect(warnings.map((w) => w.code)).toEqual(["unknown_id"]);
  });

  it("removes bullets with numbers the profile does not contain", () => {
    const { document, warnings } = assembleResume(
      SAMPLE_PROFILE,
      tailored({
        experience: [
          {
            id: "exp-0",
            bullets: ["Cut report time by 40% with automated SQL pipelines", "Merged 3 data sources in SQL into one churn report"],
          },
        ],
      }),
    );
    expect(document.experience[0].bullets).toEqual(["Merged 3 data sources in SQL into one churn report"]);
    expect(warnings[0].code).toBe("unsupported_number");
  });

  it("does not let a number from another item justify a bullet", () => {
    // 78 is in the project, not in the stc co-op.
    const { document } = assembleResume(
      SAMPLE_PROFILE,
      tailored({ experience: [{ id: "exp-0", bullets: ["Improved churn accuracy to 78%"] }] }),
    );
    expect(document.experience[0].bullets).toEqual([]);
  });

  it("removes skills the profile never mentions but keeps tools named in projects", () => {
    const { document, warnings } = assembleResume(SAMPLE_PROFILE, tailored({ skills: ["SQL", "Tableau", "scikit-learn", "sql"] }));
    expect(document.skills).toEqual(["SQL", "scikit-learn"]);
    expect(warnings).toEqual([expect.objectContaining({ code: "unsupported_skill" })]);
  });

  it("restores a degree the model left out", () => {
    const { document, warnings } = assembleResume(SAMPLE_PROFILE, tailored({ education: [] }));
    expect(document.education.map((e) => e.institution)).toEqual(["King Saud University"]);
    expect(warnings.map((w) => w.code)).toContain("missing_degree_restored");
  });

  it("flags made-up numbers in the summary", () => {
    const { warnings } = assembleResume(SAMPLE_PROFILE, tailored({ summary: "Graduate with 15 years of experience." }));
    expect(warnings.map((w) => w.code)).toContain("unsupported_number");
  });
});

describe("checkCoverLetter", () => {
  it("passes numbers from the profile and flags others", () => {
    const ok = checkCoverLetter(SAMPLE_PROFILE, { greeting: "Dear team,", paragraphs: ["I analysed 12,000 records."], closing: "Kind regards," });
    const bad = checkCoverLetter(SAMPLE_PROFILE, { greeting: "Dear team,", paragraphs: ["I led a team of 15."], closing: "Kind regards," });
    expect(ok).toEqual([]);
    expect(bad).toHaveLength(1);
  });
});
