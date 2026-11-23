"use client";

import { useActionState, useState } from "react";
import { translator, type Lang } from "@/lib/i18n";
import type { AddressForm, CandidateProfile } from "@/lib/tailoring/schemas";
import { saveProfileAction, type FormState } from "../../actions";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/**
 * Edits the CV facts in place. Names, dates and institutions stay as written;
 * bullets are one per line. The server validates the whole profile again.
 */
export function ProfileEditor({ lang, addressForm, profile }: { lang: Lang; addressForm: AddressForm; profile: CandidateProfile }) {
  const t = translator(lang, addressForm);
  const [p, setP] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await saveProfileAction(prev, form);
    if (result?.ok) setEditing(false);
    return result;
  }, null);

  const head = (title: string) => <h2 style={{ fontSize: "1rem", margin: ".9rem 0 .3rem" }}>{title}</h2>;

  if (!editing)
    return (
      <div className="card">
        <div className="card-head">
          <h2>{p.fullName}</h2>
          <button type="button" className="btn-text" onClick={() => setEditing(true)}>{t("Edit", "تعديل")}</button>
        </div>
        <div lang="en" dir="ltr" style={{ textAlign: "left" }}>
          <p className="small muted">{[p.city, p.email, p.phone].filter(Boolean).join(" · ")}</p>
          {p.education.length > 0 && head(t("Education", "التعليم"))}
          {p.education.map((e) => (
            <div className="fact" key={e.id || e.institution}>
              <div><b>{[e.degree, e.field].filter(Boolean).join(", ")}</b><div className="small muted">{[e.institution, e.endDate, e.gpa && `GPA ${e.gpa}`].filter(Boolean).join(" · ")}</div></div>
            </div>
          ))}
          {p.experience.length > 0 && head(t("Experience", "الخبرة"))}
          {p.experience.map((e) => (
            <div className="fact" key={e.id || e.role + e.organization}>
              <div>
                <b>{e.role}</b>
                <div className="small muted">{[e.organization, [e.startDate, e.endDate].filter(Boolean).join("–")].filter(Boolean).join(" · ")}</div>
                <ul style={{ margin: ".25rem 0 0", paddingLeft: "1rem" }}>{e.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
              </div>
            </div>
          ))}
          {p.projects.length > 0 && head(t("Projects", "المشاريع"))}
          {p.projects.map((x) => (
            <div className="fact" key={x.id || x.name}>
              <div>
                <b>{x.name}</b>
                <div className="small muted">{[x.context, x.technologies.join(", ")].filter(Boolean).join(" · ")}</div>
                <ul style={{ margin: ".25rem 0 0", paddingLeft: "1rem" }}>{x.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
              </div>
            </div>
          ))}
          {head(t("Skills", "المهارات"))}
          <div className="chips">{p.skills.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
          {head(t("Languages", "اللغات"))}
          <p>{p.languages.map((l) => `${l.name} (${l.level})`).join(" · ")}</p>
        </div>
      </div>
    );

  return (
    <form action={action} className="card" style={{ display: "grid", gap: ".8rem" }}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="profile" value={JSON.stringify(p)} />
      <div className="card-head" style={{ marginBottom: 0 }}><h2>{t("Edit your details", "عدّل معلوماتك", "عدّلي معلوماتك")}</h2></div>
      <div className="grid2" lang="en" dir="ltr">
        <label className="field">Full name<input className="input" value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} /></label>
        <label className="field">Email<input className="input" value={p.email ?? ""} onChange={(e) => setP({ ...p, email: e.target.value || null })} /></label>
        <label className="field">City<input className="input" value={p.city ?? ""} onChange={(e) => setP({ ...p, city: e.target.value || null })} /></label>
        <label className="field">LinkedIn<input className="input" value={p.linkedin ?? ""} onChange={(e) => setP({ ...p, linkedin: e.target.value || null })} /></label>
      </div>
      <div lang="en" dir="ltr" style={{ display: "grid", gap: ".8rem" }}>
        {p.experience.map((e, i) => (
          <label className="field" key={`exp-${i}`}>
            <span><b>{e.role}</b>, {e.organization} (one bullet per line)</span>
            <textarea
              className="input"
              value={e.bullets.join("\n")}
              onChange={(ev) => setP({ ...p, experience: p.experience.map((x, j) => (j === i ? { ...x, bullets: lines(ev.target.value) } : x)) })}
            />
          </label>
        ))}
        {p.projects.map((x, i) => (
          <label className="field" key={`proj-${i}`}>
            <span><b>{x.name}</b> (one bullet per line)</span>
            <textarea
              className="input"
              value={x.bullets.join("\n")}
              onChange={(ev) => setP({ ...p, projects: p.projects.map((y, j) => (j === i ? { ...y, bullets: lines(ev.target.value) } : y)) })}
            />
          </label>
        ))}
        <label className="field">
          Skills (comma separated)
          <input className="input" value={p.skills.join(", ")} onChange={(e) => setP({ ...p, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </label>
      </div>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <div className="row-btns">
        <button className="btn btn-cta" disabled={pending}>{t("Save", "احفظ", "احفظي")}</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setP(profile); setEditing(false); }}>{t("Cancel", "إلغاء")}</button>
      </div>
    </form>
  );
}
