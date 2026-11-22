import type { CandidateProfile } from "@/lib/tailoring/schemas";

/**
 * A quick fit level for the job list, before any AI work: 2 great, 1 good,
 * 0 partial. It counts how many of the candidate's skills and tools appear in
 * the posting. The real analysis happens when a pack is prepared.
 */
export function fitLevel(profile: CandidateProfile | null, description: string): 0 | 1 | 2 {
  if (!profile) return 1;
  const terms = new Set(
    [
      ...profile.skills,
      ...profile.projects.flatMap((p) => p.technologies),
      ...profile.education.map((e) => e.field ?? ""),
    ]
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length >= 2),
  );
  if (terms.size === 0) return 1;
  const text = description.toLowerCase();
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hits = [...terms].filter((t) => new RegExp(`(^|[^a-z0-9])${escape(t)}([^a-z0-9]|$)`).test(text)).length;
  if (hits >= 4 || hits / terms.size >= 0.5) return 2;
  if (hits >= 2) return 1;
  return 0;
}
