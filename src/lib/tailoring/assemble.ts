import { z } from "zod";
import {
  CertificationSchema,
  EducationSchema,
  ExperienceSchema,
  LanguageSchema,
  ProjectSchema,
  type CandidateProfile,
  type Certification,
  type CoverLetter,
  type TailoredResume,
} from "./schemas";

/**
 * Deterministic guards around the model's output.
 *
 * The model only picks ids and rewrites bullets. Here we copy the facts from
 * the profile, drop anything that points at an unknown id, drop skills the
 * profile never mentions, and drop bullets that introduce numbers the profile
 * does not contain. Every intervention is reported as a warning so the
 * candidate sees it before using the document.
 */

/** The finished, fully resolved resume that renderers and the UI use. */
export const ResumeDocumentSchema = z.object({
  fullName: z.string(),
  contact: z.object({
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    linkedin: z.string().nullable(),
    portfolio: z.string().nullable(),
  }),
  headline: z.string(),
  summary: z.string(),
  education: z.array(EducationSchema),
  experience: z.array(ExperienceSchema),
  projects: z.array(ProjectSchema),
  certifications: z.array(CertificationSchema),
  skills: z.array(z.string()),
  languages: z.array(LanguageSchema),
});

export type ResumeDocument = z.infer<typeof ResumeDocumentSchema>;

export interface Warning {
  code: "unknown_id" | "unsupported_skill" | "unsupported_number" | "missing_degree_restored";
  message: string;
}

/** Give every profile item a stable, predictable id ("edu-0", "exp-1", ...). */
export function assignIds(profile: CandidateProfile): CandidateProfile {
  return {
    ...profile,
    education: profile.education.map((item, i) => ({ ...item, id: `edu-${i}` })),
    experience: profile.experience.map((item, i) => ({ ...item, id: `exp-${i}` })),
    projects: profile.projects.map((item, i) => ({ ...item, id: `proj-${i}` })),
    certifications: profile.certifications.map((item, i) => ({ ...item, id: `cert-${i}` })),
  };
}

const NUMBER_PATTERN = /\d+(?:[.,]\d+)*/g;

/** Numbers that appear in a piece of text, normalised ("1,200" -> "1200"). */
export function numbersIn(text: string): string[] {
  return (text.match(NUMBER_PATTERN) ?? []).map((n) => n.replace(/,/g, ""));
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

/** All of the profile's text, for "does this fact exist anywhere" checks. */
export function profileCorpus(profile: CandidateProfile): string {
  return JSON.stringify(profile);
}

function unsupportedNumbers(text: string, sourceNumbers: Set<string>): string[] {
  return numbersIn(text).filter((n) => !sourceNumbers.has(n));
}

function pickById<T extends { id: string }>(
  items: T[],
  rewrites: Array<{ id: string; bullets: string[] }>,
  section: string,
  warnings: Warning[],
): Array<{ item: T; bullets: string[] }> {
  const byId = new Map(items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const picked: Array<{ item: T; bullets: string[] }> = [];
  for (const rewrite of rewrites) {
    const item = byId.get(rewrite.id);
    if (!item) {
      warnings.push({ code: "unknown_id", message: `Ignored ${section} "${rewrite.id}": not in the profile.` });
      continue;
    }
    if (seen.has(rewrite.id)) continue;
    seen.add(rewrite.id);
    picked.push({ item, bullets: rewrite.bullets });
  }
  return picked;
}

function keepGroundedBullets(
  bullets: string[],
  sourceNumbers: Set<string>,
  label: string,
  warnings: Warning[],
): string[] {
  return bullets.filter((bullet) => {
    const bad = unsupportedNumbers(bullet, sourceNumbers);
    if (bad.length > 0) {
      warnings.push({
        code: "unsupported_number",
        message: `Removed a bullet under ${label} with numbers not in your profile (${bad.join(", ")}): "${bullet}"`,
      });
      return false;
    }
    return true;
  });
}

export function assembleResume(
  profile: CandidateProfile,
  tailored: TailoredResume,
): { document: ResumeDocument; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const allNumbers = new Set(numbersIn(profileCorpus(profile)));

  // Education: every degree stays, in the model's order, missing ones appended.
  const pickedEducation = pickById(profile.education, tailored.education, "education", warnings);
  for (const edu of profile.education) {
    if (!pickedEducation.some((p) => p.item.id === edu.id)) {
      pickedEducation.push({ item: edu, bullets: edu.highlights.slice(0, 3) });
      warnings.push({
        code: "missing_degree_restored",
        message: `Added back "${edu.degree}, ${edu.institution}", which the draft left out.`,
      });
    }
  }
  const education = pickedEducation.map(({ item, bullets }) => ({
    ...item,
    highlights: keepGroundedBullets(bullets, new Set(numbersIn(JSON.stringify(item))), item.institution, warnings),
  }));

  const experience = pickById(profile.experience, tailored.experience, "experience", warnings).map(
    ({ item, bullets }) => ({
      ...item,
      bullets: keepGroundedBullets(bullets, new Set(numbersIn(JSON.stringify(item))), item.organization, warnings),
    }),
  );

  const projects = pickById(profile.projects, tailored.projects, "project", warnings).map(({ item, bullets }) => ({
    ...item,
    bullets: keepGroundedBullets(bullets, new Set(numbersIn(JSON.stringify(item))), item.name, warnings),
  }));

  const certById = new Map(profile.certifications.map((c) => [c.id, c]));
  const certifications: Certification[] = [];
  for (const id of new Set(tailored.certificationIds)) {
    const cert = certById.get(id);
    if (cert) certifications.push(cert);
    else warnings.push({ code: "unknown_id", message: `Ignored certification "${id}": not in the profile.` });
  }

  const corpus = normalise(profileCorpus(profile));
  const skills: string[] = [];
  for (const skill of tailored.skills) {
    const key = normalise(skill);
    if (!key) continue;
    if (corpus.includes(key)) {
      if (!skills.some((s) => normalise(s) === key)) skills.push(skill);
    } else {
      warnings.push({ code: "unsupported_skill", message: `Removed skill "${skill}": it is not in your profile.` });
    }
  }

  const summaryNumbers = unsupportedNumbers(`${tailored.headline} ${tailored.summary}`, allNumbers);
  if (summaryNumbers.length > 0) {
    warnings.push({
      code: "unsupported_number",
      message: `The summary mentions numbers not in your profile (${summaryNumbers.join(", ")}). Check it before using it.`,
    });
  }

  const location = [profile.city, profile.country].filter(Boolean).join(", ") || null;

  return {
    document: {
      fullName: profile.fullName,
      contact: {
        email: profile.email,
        phone: profile.phone,
        location,
        linkedin: profile.linkedin,
        portfolio: profile.portfolio,
      },
      headline: tailored.headline,
      summary: tailored.summary,
      education,
      experience,
      projects,
      certifications,
      skills,
      languages: profile.languages,
    },
    warnings,
  };
}

/** Cover letters are prose, so we only flag unsupported numbers, we do not edit. */
export function checkCoverLetter(profile: CandidateProfile, letter: CoverLetter): Warning[] {
  const allNumbers = new Set(numbersIn(profileCorpus(profile)));
  const bad = unsupportedNumbers(letter.paragraphs.join(" "), allNumbers);
  return bad.length > 0
    ? [
        {
          code: "unsupported_number",
          message: `The cover letter mentions numbers not in your profile (${bad.join(", ")}). Check it before using it.`,
        },
      ]
    : [];
}
