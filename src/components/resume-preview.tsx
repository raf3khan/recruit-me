import type { ResumeDocument } from "@/lib/tailoring/assemble";

/** The English resume as the candidate will send it. */
export function ResumePreview({ doc }: { doc: ResumeDocument }) {
  const contact = [doc.contact.location, doc.contact.email, doc.contact.phone, doc.contact.linkedin].filter(Boolean).join(" · ");
  return (
    <div className="doc" lang="en" dir="ltr">
      <h4>{doc.fullName}</h4>
      {contact && <p className="c">{contact}</p>}
      <p className="c" style={{ color: "var(--ink)", fontWeight: 600, marginTop: ".3rem" }}>{doc.headline}</p>
      {doc.summary && <p style={{ marginTop: ".5rem" }}>{doc.summary}</p>}
      {doc.education.length > 0 && <h5>Education</h5>}
      {doc.education.map((e) => (
        <div key={e.id}>
          <b>{[e.degree, e.field].filter(Boolean).join(", ")}</b>, {e.institution} · {[e.startDate, e.endDate].filter(Boolean).join("–")}
          {e.gpa ? ` · GPA ${e.gpa}` : ""}
          {e.highlights.length > 0 && <ul>{e.highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
        </div>
      ))}
      {doc.experience.length > 0 && <h5>Experience</h5>}
      {doc.experience.map((e) => (
        <div key={e.id}>
          <b>{e.role}</b>, {e.organization} · {[e.startDate, e.endDate].filter(Boolean).join("–")}
          <ul>{e.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      ))}
      {doc.projects.length > 0 && <h5>Projects</h5>}
      {doc.projects.map((p) => (
        <div key={p.id}>
          <b>{p.name}</b>
          {p.technologies.length > 0 ? ` · ${p.technologies.join(", ")}` : ""}
          <ul>{p.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      ))}
      {doc.certifications.length > 0 && <h5>Certifications</h5>}
      {doc.certifications.map((c) => (
        <div key={c.id}>{[c.name, c.issuer, c.date].filter(Boolean).join(", ")}</div>
      ))}
      {doc.skills.length > 0 && (
        <>
          <h5>Skills</h5>
          {doc.skills.join(" · ")}
        </>
      )}
      {doc.languages.length > 0 && (
        <>
          <h5>Languages</h5>
          {doc.languages.map((l) => `${l.name} (${l.level})`).join(" · ")}
        </>
      )}
    </div>
  );
}
