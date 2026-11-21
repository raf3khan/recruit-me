"use client";

import { useState } from "react";
import type { ApplicationPack } from "@/lib/tailoring/pipeline";
import { SAMPLE_JOB, SAMPLE_PROFILE } from "@/lib/tailoring/sample";
import type { CandidateProfile, CoverLetter, JobPosting } from "@/lib/tailoring/schemas";

type Pack = ApplicationPack & { provider: string };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "صار خطأ. جرّب مرة ثانية.");
  return data as T;
}

async function download(body: unknown) {
  const res = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("ما قدرنا نجهّز الملف.");
  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "document.docx";
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function Card({ step, title, children }: { step?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold">
        {step && (
          <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">{step}</span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
const primaryButton =
  "rounded-xl bg-accent px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:text-black";
const secondaryButton =
  "rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-background disabled:opacity-50";

export function TailorFlow() {
  const [cvText, setCvText] = useState("");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [job, setJob] = useState<JobPosting>({ title: "", company: null, location: null, description: "", url: null });
  const [pack, setPack] = useState<Pack | null>(null);
  const [letter, setLetter] = useState<CoverLetter | null>(null);
  const [busy, setBusy] = useState<"profile" | "tailor" | "export" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(kind: typeof busy, fn: () => Promise<T>) {
    setBusy(kind);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const readCv = () =>
    run("profile", async () => {
      const data = await postJson<{ profile: CandidateProfile }>("/api/profile", { cvText });
      setProfile(data.profile);
      setPack(null);
    });

  const tailor = () =>
    run("tailor", async () => {
      if (!profile) return;
      const data = await postJson<Pack>("/api/tailor", { profile, job });
      setPack(data);
      setLetter(data.coverLetter);
    });

  const jobReady = job.title.trim().length > 0 && job.description.trim().length >= 80;

  return (
    <div className="flex flex-col gap-5">
      <Card step="١" title="سيرتك الذاتية">
        <p className="mb-3 text-sm text-muted">
          الصق نص سيرتك (عربي أو إنجليزي). نطلع منها معلوماتك ونستخدمها بس، ما نضيف شي من عندنا.
        </p>
        <textarea
          className={`${inputClass} min-h-40`}
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="الاسم، التعليم، التدريب التعاوني، المشاريع، المهارات..."
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={primaryButton} onClick={readCv} disabled={busy !== null || cvText.trim().length < 50}>
            {busy === "profile" ? "نقرأ سيرتك..." : "اقرأ سيرتي"}
          </button>
          <button
            className={secondaryButton}
            onClick={() => {
              setProfile(SAMPLE_PROFILE);
              setPack(null);
            }}
            disabled={busy !== null}
          >
            جرّب بسيرة مثال
          </button>
        </div>
        {profile && <ProfileSummary profile={profile} />}
      </Card>

      <Card step="٢" title="الوظيفة">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            المسمى الوظيفي
            <input className={`${inputClass} mt-1`} dir="auto" value={job.title} onChange={(e) => setJob({ ...job, title: e.target.value })} />
          </label>
          <label className="text-sm">
            الشركة
            <input
              className={`${inputClass} mt-1`}
              dir="auto"
              value={job.company ?? ""}
              onChange={(e) => setJob({ ...job, company: e.target.value || null })}
            />
          </label>
          <label className="text-sm">
            المدينة
            <input
              className={`${inputClass} mt-1`}
              dir="auto"
              value={job.location ?? ""}
              onChange={(e) => setJob({ ...job, location: e.target.value || null })}
            />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          وصف الوظيفة كامل
          <textarea
            className={`${inputClass} mt-1 min-h-40`}
            dir="auto"
            value={job.description}
            onChange={(e) => setJob({ ...job, description: e.target.value })}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={primaryButton} onClick={tailor} disabled={busy !== null || !profile || !jobReady}>
            {busy === "tailor" ? "نجهّز ملفاتك... (أقل من دقيقة)" : "جهّز السيرة والخطاب"}
          </button>
          <button className={secondaryButton} onClick={() => setJob(SAMPLE_JOB)} disabled={busy !== null}>
            جرّب بوظيفة مثال
          </button>
        </div>
        {!profile && <p className="mt-2 text-sm text-muted">أول شي جهّز سيرتك في الخطوة ١.</p>}
      </Card>

      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-warn">
          {error}
        </p>
      )}

      {pack && letter && (
        <Results
          pack={pack}
          letter={letter}
          onLetterChange={setLetter}
          busy={busy === "export"}
          onDownload={(body) => run("export", () => download(body))}
        />
      )}
    </div>
  );
}

function ProfileSummary({ profile }: { profile: CandidateProfile }) {
  return (
    <div className="mt-4 rounded-xl bg-accent-soft p-4 text-sm">
      <p className="font-semibold">هذي المعلومات اللي بنستخدمها. تأكد إنها صحيحة:</p>
      <ul className="mt-2 list-disc space-y-1 ps-5" dir="ltr">
        <li className="text-start">{profile.fullName}</li>
        {profile.education.map((e) => (
          <li key={e.id} className="text-start">
            {e.degree} in {e.field}, {e.institution} {e.endDate && `(${e.endDate})`}
          </li>
        ))}
        {profile.experience.map((x) => (
          <li key={x.id} className="text-start">
            {x.role}, {x.organization}
          </li>
        ))}
        {profile.projects.map((p) => (
          <li key={p.id} className="text-start">
            {p.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Results({
  pack,
  letter,
  onLetterChange,
  onDownload,
  busy,
}: {
  pack: Pack;
  letter: CoverLetter;
  onLetterChange: (l: CoverLetter) => void;
  onDownload: (body: unknown) => void;
  busy: boolean;
}) {
  const { resume } = pack;
  return (
    <div className="flex flex-col gap-5">
      {pack.provider === "mock" && (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          وضع تجريبي: النتيجة هنا مو مفصّلة بالذكاء الاصطناعي. أضف ANTHROPIC_API_KEY عشان تشوف النسخة الحقيقية.
        </p>
      )}

      <Card step="٣" title="وش يناسبك في الوظيفة">
        {pack.coverage.length > 0 && (
          <>
            <h3 className="mb-2 text-sm font-semibold">متطلبات عندك اللي يثبتها</h3>
            <ul className="mb-4 space-y-1 text-sm" dir="ltr">
              {pack.coverage.map((c) => (
                <li key={c.requirement} className="text-start">
                  ✓ {c.requirement}
                </li>
              ))}
            </ul>
          </>
        )}
        {pack.gaps.length > 0 && (
          <>
            <h3 className="mb-2 text-sm font-semibold">متطلبات ما تبيّن في سيرتك</h3>
            <ul className="mb-4 space-y-1 text-sm text-muted" dir="ltr">
              {pack.gaps.map((g) => (
                <li key={g} className="text-start">
                  – {g}
                </li>
              ))}
            </ul>
          </>
        )}
        {pack.adviceAr.length > 0 && (
          <>
            <h3 className="mb-2 text-sm font-semibold">نصايح لهالتقديم</h3>
            <ul className="list-disc space-y-1 ps-5 text-sm">
              {pack.adviceAr.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </>
        )}
        {pack.warnings.length > 0 && (
          <div className="mt-4 rounded-xl bg-warn-soft p-4 text-sm">
            <p className="font-semibold text-warn">عدّلنا أشياء عشان ما يطلع شي مو موجود في سيرتك:</p>
            <ul className="mt-2 space-y-1" dir="ltr">
              {pack.warnings.map((w, i) => (
                <li key={i} className="text-start">
                  {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card step="٤" title="السيرة الذاتية (بالإنجليزي)">
        <article dir="ltr" lang="en" className="rounded-xl border border-border bg-background p-5 text-start text-sm leading-relaxed">
          <h3 className="text-center text-xl font-bold">{resume.fullName}</h3>
          <p className="text-center">{resume.headline}</p>
          <p className="mb-3 text-center text-xs text-muted">
            {[resume.contact.location, resume.contact.phone, resume.contact.email, resume.contact.linkedin].filter(Boolean).join("  |  ")}
          </p>
          <ResumeSection title="Summary">
            <p>{resume.summary}</p>
          </ResumeSection>
          <ResumeSection title="Education">
            {resume.education.map((e) => (
              <Entry key={e.id} left={`${e.institution}`} right={[e.startDate, e.endDate].filter(Boolean).join(" – ")}>
                <p className="italic">
                  {e.degree} in {e.field}
                  {e.gpa && ` | GPA ${e.gpa}`}
                </p>
                <Bullets items={e.highlights} />
              </Entry>
            ))}
          </ResumeSection>
          {resume.experience.length > 0 && (
            <ResumeSection title="Experience">
              {resume.experience.map((x) => (
                <Entry key={x.id} left={`${x.role}, ${x.organization}`} right={[x.startDate, x.endDate].filter(Boolean).join(" – ")}>
                  <Bullets items={x.bullets} />
                </Entry>
              ))}
            </ResumeSection>
          )}
          {resume.projects.length > 0 && (
            <ResumeSection title="Projects">
              {resume.projects.map((p) => (
                <Entry key={p.id} left={`${p.name}${p.context ? `, ${p.context}` : ""}`}>
                  <Bullets items={p.bullets} />
                </Entry>
              ))}
            </ResumeSection>
          )}
          {resume.certifications.length > 0 && (
            <ResumeSection title="Certifications">
              <Bullets items={resume.certifications.map((c) => [c.name, c.issuer, c.date].filter(Boolean).join(", "))} />
            </ResumeSection>
          )}
          <ResumeSection title="Skills">
            <p>{resume.skills.join(", ")}</p>
            <p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(", ")}</p>
          </ResumeSection>
        </article>
        <button className={`${primaryButton} mt-4`} disabled={busy} onClick={() => onDownload({ kind: "resume", resume })}>
          نزّل السيرة (Word)
        </button>
      </Card>

      <Card step="٥" title="خطاب التقديم (بالإنجليزي)">
        <p className="mb-3 text-sm text-muted">تقدر تعدّل الخطاب هنا قبل ما تنزّله.</p>
        <div dir="ltr" lang="en" className="flex flex-col gap-3 text-start">
          <input className={inputClass} value={letter.greeting} onChange={(e) => onLetterChange({ ...letter, greeting: e.target.value })} />
          {letter.paragraphs.map((p, i) => (
            <textarea
              key={i}
              className={`${inputClass} min-h-28 leading-relaxed`}
              value={p}
              onChange={(e) =>
                onLetterChange({ ...letter, paragraphs: letter.paragraphs.map((q, j) => (j === i ? e.target.value : q)) })
              }
            />
          ))}
          <p>
            {letter.closing}
            <br />
            {resume.fullName}
          </p>
        </div>
        <button
          className={`${primaryButton} mt-4`}
          disabled={busy}
          onClick={() => onDownload({ kind: "cover_letter", coverLetter: letter, fullName: resume.fullName })}
        >
          نزّل الخطاب (Word)
        </button>
      </Card>
    </div>
  );
}

function ResumeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3">
      <h4 className="mb-1 border-b border-border pb-0.5 text-xs font-bold uppercase tracking-wide">{title}</h4>
      {children}
    </section>
  );
}

function Entry({ left, right, children }: { left: string; right?: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between gap-4 font-semibold">
        <span>{left}</span>
        {right && <span className="shrink-0 font-normal text-muted">{right}</span>}
      </div>
      {children}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="list-disc ps-5">
      {items.map((b) => (
        <li key={b}>{b}</li>
      ))}
    </ul>
  );
}
