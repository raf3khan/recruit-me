import { cookies } from "next/headers";
import { SESSION_COOKIE, userForToken } from "@/lib/auth/session";
import { getJob, NotFound } from "@/lib/app/service";
import { getDb } from "@/lib/db";
import { coverLetterToDocx, resumeToDocx } from "@/lib/render/docx";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function fileName(name: string, suffix: string): string {
  const safe = name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "Candidate";
  return `${safe}_${suffix}.docx`;
}

/** The signed-in user's resume or cover letter for one job, as a Word file. */
export async function GET(request: Request, { params }: RouteContext<"/api/jobs/[id]/docx">) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const db = await getDb();
  const user = await userForToken(db, token);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  let row;
  try {
    row = await getJob(db, user, id);
  } catch (error) {
    if (error instanceof NotFound) return new Response("Not found", { status: 404 });
    throw error;
  }
  if (!row.pack) return new Response("Not prepared", { status: 409 });
  const kind = new URL(request.url).searchParams.get("kind");
  const resume = row.pack.pack.resume;
  const [buffer, name] =
    kind === "letter"
      ? [await coverLetterToDocx(row.pack.letter, resume.fullName), fileName(resume.fullName, "Cover_Letter")]
      : [await resumeToDocx(resume), fileName(resume.fullName, "Resume")];
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": DOCX, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}
