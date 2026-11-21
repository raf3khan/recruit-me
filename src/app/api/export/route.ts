import { z } from "zod";
import { errorResponse, readJson } from "@/lib/api";
import { coverLetterToDocx, resumeToDocx } from "@/lib/render/docx";
import { ResumeDocumentSchema } from "@/lib/tailoring/assemble";
import { CoverLetterSchema } from "@/lib/tailoring/schemas";

const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("resume"), resume: ResumeDocumentSchema }),
  z.object({ kind: z.literal("cover_letter"), coverLetter: CoverLetterSchema, fullName: z.string() }),
]);

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function fileName(name: string, suffix: string): string {
  const safe = name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "Candidate";
  return `${safe}_${suffix}.docx`;
}

/** Turns a reviewed resume or cover letter into a Word file. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request, Body);
    const [buffer, name] =
      body.kind === "resume"
        ? [await resumeToDocx(body.resume), fileName(body.resume.fullName, "Resume")]
        : [await coverLetterToDocx(body.coverLetter, body.fullName), fileName(body.fullName, "Cover_Letter")];
    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": DOCX, "Content-Disposition": `attachment; filename="${name}"` },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
