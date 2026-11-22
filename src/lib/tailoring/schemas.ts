import { z } from "zod";

/**
 * Schemas shared by the LLM layer (as structured-output formats) and the app.
 *
 * Rules that keep them usable as structured outputs:
 * - every field is required; "unknown" is expressed as `null`, not omission
 * - no numeric/string length constraints (the model is steered by the prompt)
 */

// ---------------------------------------------------------------------------
// Candidate profile: the single source of truth for every fact in a document.
// ---------------------------------------------------------------------------

export const EducationSchema = z.object({
  id: z.string().describe('Stable id such as "edu-0". Assigned by the app.'),
  institution: z.string(),
  degree: z.string().describe('e.g. "Bachelor of Science"'),
  field: z.string().describe('e.g. "Information Systems"'),
  location: z.string().nullable(),
  startDate: z.string().nullable().describe('As written, e.g. "Sep 2021"'),
  endDate: z.string().nullable().describe('As written, e.g. "Jun 2025" or "Expected Jun 2026"'),
  gpa: z.string().nullable().describe('As written, e.g. "4.6/5"'),
  highlights: z.array(z.string()).describe("Honours, relevant courses, graduation project"),
});

export const ExperienceTypeSchema = z.enum([
  "internship",
  "coop",
  "full_time",
  "part_time",
  "freelance",
  "volunteer",
]);

export const ExperienceSchema = z.object({
  id: z.string().describe('Stable id such as "exp-0". Assigned by the app.'),
  organization: z.string(),
  role: z.string(),
  type: ExperienceTypeSchema,
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  bullets: z.array(z.string()),
});

export const ProjectSchema = z.object({
  id: z.string().describe('Stable id such as "proj-0". Assigned by the app.'),
  name: z.string(),
  context: z.string().nullable().describe('e.g. "Graduation project", "Hackathon", "Personal"'),
  technologies: z.array(z.string()),
  bullets: z.array(z.string()),
  link: z.string().nullable(),
});

export const CertificationSchema = z.object({
  id: z.string().describe('Stable id such as "cert-0". Assigned by the app.'),
  name: z.string(),
  issuer: z.string().nullable(),
  date: z.string().nullable(),
});

export const LanguageSchema = z.object({
  name: z.string(),
  level: z.string().describe('e.g. "Native", "Fluent", "IELTS 7.0"'),
});

export const CandidateProfileSchema = z.object({
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  linkedin: z.string().nullable(),
  portfolio: z.string().nullable(),
  education: z.array(EducationSchema),
  experience: z.array(ExperienceSchema),
  projects: z.array(ProjectSchema),
  certifications: z.array(CertificationSchema),
  skills: z.array(z.string()),
  languages: z.array(LanguageSchema),
  activities: z.array(z.string()).describe("Clubs, volunteering, competitions, leadership"),
});

export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Certification = z.infer<typeof CertificationSchema>;

/**
 * How the app speaks to the candidate in Arabic. Asked once at sign-up.
 * "neutral" is used when we don't know (public pages, old accounts).
 */
export const AddressFormSchema = z.enum(["masculine", "feminine", "neutral"]);

export type AddressForm = z.infer<typeof AddressFormSchema>;

// ---------------------------------------------------------------------------
// Job posting and the model's reading of it.
// ---------------------------------------------------------------------------

export const JobPostingSchema = z.object({
  title: z.string(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  description: z.string().describe("Full posting text as the candidate pasted it"),
  url: z.string().nullable(),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;

export const JobAnalysisSchema = z.object({
  title: z.string(),
  company: z.string().nullable(),
  seniority: z.enum(["internship", "entry", "junior", "mid", "senior", "unknown"]),
  mustHave: z.array(z.string()).describe("Hard requirements, short phrases"),
  niceToHave: z.array(z.string()),
  keywords: z.array(z.string()).describe("Terms an ATS or recruiter will scan for"),
  responsibilities: z.array(z.string()),
  companyContext: z
    .string()
    .nullable()
    .describe("One or two sentences on what the company/team does, only from the posting"),
});

export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;

// ---------------------------------------------------------------------------
// Tailored resume: the model may only choose, order and reword.
// Facts (names, institutions, dates, titles) are copied from the profile by id
// when the document is assembled, so the model cannot change them.
// ---------------------------------------------------------------------------

const RewrittenItemSchema = z.object({
  id: z.string().describe("Id of the profile item this rewrites"),
  bullets: z.array(z.string()),
});

export const TailoredResumeSchema = z.object({
  headline: z.string().describe('One line under the name, e.g. "Information Systems Graduate | Data Analysis"'),
  summary: z.string().describe("2-3 sentences, no first person"),
  education: z.array(RewrittenItemSchema).describe("Ordered; bullets are the highlights to show"),
  experience: z.array(RewrittenItemSchema).describe("Ordered most relevant first"),
  projects: z.array(RewrittenItemSchema).describe("Ordered most relevant first"),
  certificationIds: z.array(z.string()),
  skills: z.array(z.string()).describe("Only skills present in the profile, most relevant first"),
  coverage: z.array(
    z.object({
      requirement: z.string(),
      evidenceIds: z.array(z.string()).describe("Profile item ids that show this requirement"),
    }),
  ),
  gaps: z.array(z.string()).describe("Must-have requirements the profile does not show"),
  adviceAr: z
    .array(z.string())
    .describe("2-4 short tips for the candidate in Saudi dialect Arabic"),
});

export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

export const CoverLetterSchema = z.object({
  greeting: z.string().describe('e.g. "Dear Hiring Team at Elm,"'),
  paragraphs: z.array(z.string()).describe("3-4 paragraphs"),
  closing: z.string().describe('e.g. "Kind regards,"'),
});

export type CoverLetter = z.infer<typeof CoverLetterSchema>;
