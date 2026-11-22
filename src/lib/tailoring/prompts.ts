import type { AddressForm, CandidateProfile, JobAnalysis, JobPosting, TailoredResume } from "./schemas";

/**
 * Prompts for each step. Documents are in English (private-sector GCC jobs);
 * candidate-facing advice is in Saudi dialect Arabic.
 */

const GROUNDING_RULES = `Truthfulness rules, which outrank everything else:
- Use only facts present in the candidate profile. Never invent employers, roles, dates, degrees, grades, certifications, tools, numbers or results.
- You may reword, merge, shorten, reorder and drop content, and you may use the job's vocabulary when the profile genuinely supports it.
- A number (percentage, count, amount, duration) may appear only if the same number is in the profile.
- If the job asks for something the profile does not show, leave it out of the document and list it as a gap.`;

export const EXTRACT_PROFILE_SYSTEM = `You turn a candidate's CV text into a structured profile for a job-application assistant used by fresh graduates in the GCC.

- The CV may be in Arabic, English or both. Write every field in English. Transliterate Arabic names of people and institutions the way the candidate or institution writes them in English when known (e.g. "King Saud University"), otherwise use a standard transliteration.
- Copy facts faithfully. Do not improve, summarise away or add anything. Keep dates and grades exactly as written.
- Put each internship, co-op, job or volunteer role in "experience" with the closest type. Put academic, graduation, hackathon and personal projects in "projects".
- Use null for anything the CV does not state. Use empty arrays for empty sections.
- Set every "id" field to an empty string; the app assigns ids.`;

export function extractProfilePrompt(cvText: string): string {
  return `Here is the candidate's CV text:\n\n<cv>\n${cvText}\n</cv>\n\nReturn the structured profile.`;
}

export const ANALYZE_JOB_SYSTEM = `You read a job posting for a GCC private-sector role and pull out what a recruiter and an applicant tracking system will screen for.

- Keep each requirement and keyword short (2-6 words), in English, in the posting's own terms.
- "mustHave" holds explicit requirements; "niceToHave" holds preferred or bonus items.
- "keywords" holds the skills, tools, domains and certifications worth matching, most important first, at most 20.
- Only use what the posting says. Use null or "unknown" where it says nothing.`;

export function analyzeJobPrompt(job: JobPosting): string {
  return `<job>
Title: ${job.title}
Company: ${job.company ?? "not stated"}
Location: ${job.location ?? "not stated"}

${job.description}
</job>

Return the analysis.`;
}

export const TAILOR_RESUME_SYSTEM = `You tailor a fresh graduate's resume to one job in the GCC private sector. The output is an English, one-page, ATS-friendly resume.

${GROUNDING_RULES}

How to tailor:
- Choose and order items by relevance to the job. Refer to profile items only by their ids. Leave out items that add nothing for this job, but keep every degree.
- Rewrite bullets to lead with a strong past-tense action verb (present tense for current roles), show what the candidate did and why it mattered, and use the job's keywords where the profile supports them.
- At most 4 bullets per experience or project, at most 3 highlights per degree, about 15 words per bullet.
- Write the headline and a 2-3 sentence summary in a confident, plain, third-person-implied style (no "I", no clichés such as "hard-working team player").
- "skills": only skills that appear in the profile (including tools named in projects or experience), most relevant first, at most 15.
- "coverage": for each must-have requirement the profile supports, cite the ids that show it. "gaps": must-haves the profile does not show.
- "adviceAr": 2-4 short, practical tips in Saudi dialect Arabic (عامية سعودية بيضاء) for this application, for example what to prepare for the interview or which gap to address. Be warm and direct. Address the candidate exactly as <address_form> says.`;

const ADDRESS_FORM_RULES: Record<AddressForm, string> = {
  masculine: "masculine: speak to the candidate as أنت, with masculine verbs and adjectives (جهّز، ركّز، تتكلم، مستعد).",
  feminine: "feminine: speak to the candidate as أنتِ, with feminine verbs and adjectives (جهّزي، ركّزي، تتكلمين، مستعدة).",
  neutral:
    "neutral: we don't know how the candidate wants to be addressed, so avoid gendered verbs and adjectives. Use verbal nouns and impersonal phrasing (الأفضل تجهيز مثال…، يستحق التركيز على…).",
};

export function tailorResumePrompt(
  profile: CandidateProfile,
  analysis: JobAnalysis,
  job: JobPosting,
  address: AddressForm = "neutral",
): string {
  return `<address_form>
${ADDRESS_FORM_RULES[address]}
</address_form>

<candidate_profile>
${JSON.stringify(profile, null, 2)}
</candidate_profile>

<job_analysis>
${JSON.stringify(analysis, null, 2)}
</job_analysis>

<job_posting>
${job.description}
</job_posting>

Return the tailored resume.`;
}

export const COVER_LETTER_SYSTEM = `You write a cover letter in English for a fresh graduate applying to a GCC private-sector job.

${GROUNDING_RULES}

How to write it:
- 3 or 4 short paragraphs, 220-320 words in total. Plain, specific, confident. No clichés ("I am writing to express my interest", "passionate team player"), no flattery, no exclamation marks.
- Opening: the role, and one concrete reason this candidate fits it.
- Middle: two or three pieces of evidence from the tailored resume that match the job's must-haves, each tied to what the employer needs.
- Close: a short, polite call to an interview. Do not restate the whole resume.
- Mention the company by name when it is known; otherwise address the hiring team.
- Do not mention nationality, religion, age, marital status or visa status.
- Do not include addresses, dates or a signature block; the app adds the candidate's name.`;

export function coverLetterPrompt(
  profile: CandidateProfile,
  analysis: JobAnalysis,
  tailored: TailoredResume,
  job: JobPosting,
): string {
  return `<candidate_profile>
${JSON.stringify(profile, null, 2)}
</candidate_profile>

<tailored_resume>
${JSON.stringify({ headline: tailored.headline, summary: tailored.summary, experience: tailored.experience, projects: tailored.projects, coverage: tailored.coverage }, null, 2)}
</tailored_resume>

<job_analysis>
${JSON.stringify(analysis, null, 2)}
</job_analysis>

<job_posting>
${job.description}
</job_posting>

Return the cover letter.`;
}
