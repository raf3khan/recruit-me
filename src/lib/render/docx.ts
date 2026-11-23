import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx";
import type { ResumeDocument } from "../tailoring/assemble";
import type { CoverLetter } from "../tailoring/schemas";

/**
 * ATS-friendly Word files: one column, real text (no tables, images or text
 * boxes), standard section names, a common font.
 */

const FONT = "Calibri";
const BODY_SIZE = 21; // half-points: 10.5pt
const PAGE_MARGIN = 720; // twips: 0.5 inch

function run(text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}): TextRun {
  return new TextRun({ text, font: FONT, size: opts.size ?? BODY_SIZE, bold: opts.bold, italics: opts.italics });
}

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    children: [run(title.toUpperCase(), { bold: true, size: 23 })],
    spacing: { before: 200, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "444444", space: 1 } },
  });
}

/** Left text and right-aligned dates on one line. */
function titleLine(left: TextRun[], right: string | null): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: right ? [...left, run(`\t${right}`)] : left,
    spacing: { before: 80 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({ children: [run(text)], bullet: { level: 0 }, spacing: { after: 20 } });
}

function dates(start: string | null, end: string | null): string | null {
  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? null;
}

export function resumeParagraphs(doc: ResumeDocument): Paragraph[] {
  const out: Paragraph[] = [];
  const contact = [doc.contact.location, doc.contact.phone, doc.contact.email, doc.contact.linkedin, doc.contact.portfolio]
    .filter(Boolean)
    .join("  |  ");

  out.push(
    new Paragraph({ alignment: AlignmentType.CENTER, children: [run(doc.fullName, { bold: true, size: 32 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [run(doc.headline, { size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [run(contact, { size: 19 })], spacing: { after: 120 } }),
  );

  if (doc.summary) {
    out.push(sectionHeading("Summary"), new Paragraph({ children: [run(doc.summary)] }));
  }

  if (doc.education.length > 0) {
    out.push(sectionHeading("Education"));
    for (const edu of doc.education) {
      out.push(titleLine([run(edu.institution, { bold: true }), edu.location ? run(`, ${edu.location}`) : run("")], dates(edu.startDate, edu.endDate)));
      const degree = `${edu.degree} in ${edu.field}${edu.gpa ? `  |  GPA ${edu.gpa}` : ""}`;
      out.push(new Paragraph({ children: [run(degree, { italics: true })] }));
      edu.highlights.forEach((h) => out.push(bullet(h)));
    }
  }

  if (doc.experience.length > 0) {
    out.push(sectionHeading("Experience"));
    for (const exp of doc.experience) {
      out.push(titleLine([run(exp.role, { bold: true }), run(`, ${exp.organization}`)], dates(exp.startDate, exp.endDate)));
      if (exp.location) out.push(new Paragraph({ children: [run(exp.location, { italics: true })] }));
      exp.bullets.forEach((b) => out.push(bullet(b)));
    }
  }

  if (doc.projects.length > 0) {
    out.push(sectionHeading("Projects"));
    for (const project of doc.projects) {
      const left = [run(project.name, { bold: true })];
      if (project.context) left.push(run(`, ${project.context}`));
      out.push(titleLine(left, null));
      if (project.technologies.length > 0) {
        out.push(new Paragraph({ children: [run(project.technologies.join(", "), { italics: true })] }));
      }
      project.bullets.forEach((b) => out.push(bullet(b)));
    }
  }

  if (doc.certifications.length > 0) {
    out.push(sectionHeading("Certifications"));
    for (const cert of doc.certifications) {
      const text = [cert.name, cert.issuer, cert.date].filter(Boolean).join(", ");
      out.push(bullet(text));
    }
  }

  if (doc.skills.length > 0 || doc.languages.length > 0) {
    out.push(sectionHeading("Skills"));
    if (doc.skills.length > 0) {
      out.push(new Paragraph({ children: [run("Technical: ", { bold: true }), run(doc.skills.join(", "))] }));
    }
    if (doc.languages.length > 0) {
      const langs = doc.languages.map((l) => `${l.name} (${l.level})`).join(", ");
      out.push(new Paragraph({ children: [run("Languages: ", { bold: true }), run(langs)] }));
    }
  }

  return out;
}

function wrap(children: Paragraph[], title: string, author: string): Document {
  return new Document({
    creator: author,
    title,
    styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
    sections: [
      {
        properties: { page: { margin: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN } } },
        children,
      },
    ],
  });
}

export async function resumeToDocx(doc: ResumeDocument): Promise<Buffer> {
  return Packer.toBuffer(wrap(resumeParagraphs(doc), `${doc.fullName} - Resume`, doc.fullName));
}

export async function coverLetterToDocx(letter: CoverLetter, fullName: string): Promise<Buffer> {
  const children = [
    new Paragraph({ children: [run(letter.greeting)], spacing: { after: 200 } }),
    ...letter.paragraphs.map((p) => new Paragraph({ children: [run(p)], spacing: { after: 200 } })),
    new Paragraph({ children: [run(letter.closing)] }),
    new Paragraph({ children: [run(fullName)] }),
  ];
  return Packer.toBuffer(wrap(children, `${fullName} - Cover Letter`, fullName));
}

/** Plain text versions, for copy-paste into portal forms. */
export function resumeToText(doc: ResumeDocument): string {
  const lines: string[] = [doc.fullName, doc.headline];
  const contact = [doc.contact.location, doc.contact.phone, doc.contact.email, doc.contact.linkedin, doc.contact.portfolio].filter(Boolean);
  if (contact.length) lines.push(contact.join(" | "));
  if (doc.summary) lines.push("", "SUMMARY", doc.summary);
  if (doc.education.length) {
    lines.push("", "EDUCATION");
    for (const e of doc.education) {
      lines.push(`${e.institution}${e.location ? `, ${e.location}` : ""}${dates(e.startDate, e.endDate) ? ` (${dates(e.startDate, e.endDate)})` : ""}`);
      lines.push(`${e.degree} in ${e.field}${e.gpa ? ` | GPA ${e.gpa}` : ""}`);
      e.highlights.forEach((h) => lines.push(`- ${h}`));
    }
  }
  if (doc.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const x of doc.experience) {
      lines.push(`${x.role}, ${x.organization}${dates(x.startDate, x.endDate) ? ` (${dates(x.startDate, x.endDate)})` : ""}`);
      x.bullets.forEach((b) => lines.push(`- ${b}`));
    }
  }
  if (doc.projects.length) {
    lines.push("", "PROJECTS");
    for (const p of doc.projects) {
      lines.push(`${p.name}${p.context ? `, ${p.context}` : ""}${p.technologies.length ? ` (${p.technologies.join(", ")})` : ""}`);
      p.bullets.forEach((b) => lines.push(`- ${b}`));
    }
  }
  if (doc.certifications.length) {
    lines.push("", "CERTIFICATIONS");
    doc.certifications.forEach((c) => lines.push(`- ${[c.name, c.issuer, c.date].filter(Boolean).join(", ")}`));
  }
  if (doc.skills.length || doc.languages.length) {
    lines.push("", "SKILLS");
    if (doc.skills.length) lines.push(`Technical: ${doc.skills.join(", ")}`);
    if (doc.languages.length) lines.push(`Languages: ${doc.languages.map((l) => `${l.name} (${l.level})`).join(", ")}`);
  }
  return lines.join("\n");
}

export function coverLetterToText(letter: CoverLetter, fullName: string): string {
  return [letter.greeting, "", ...letter.paragraphs.flatMap((p) => [p, ""]), letter.closing, fullName].join("\n");
}
