import Link from "next/link";
import { Icon } from "@/components/icon";
import { Mark, StatusPill, companyOf, statusLabel } from "@/components/job-bits";
import { Page } from "@/components/page";
import { requireUser } from "@/lib/auth/current";
import { listApplications, needsFollowUp } from "@/lib/app/service";
import { getDb } from "@/lib/db";
import { daysAgo, isLang, translator, type Lang } from "@/lib/i18n";
import { followedUpAction, setStatusAction } from "../../actions";
import { CopyButton } from "./copy-button";

const STATUSES = ["sent", "reply", "interview", "offer", "closed"] as const;

async function Applications({ lang }: { lang: Lang }) {
  const user = await requireUser(lang);
  const t = translator(lang, user.addressForm);
  const rows = await listApplications(await getDb(), user);
  const count = (s: string) => rows.filter((r) => r.application.status === s).length;
  const due = rows.filter((r) => needsFollowUp(r.application));
  const name = user.profile?.fullName ?? "";

  if (rows.length === 0)
    return (
      <div className="card empty">
        <span className="mark" style={{ background: "var(--sky)", color: "var(--ink)" }}><Icon name="apps" /></span>
        <h2>{t("No applications yet", "ما عندك تقديمات للحين")}</h2>
        <p className="muted">{t("When you send an application, it shows up here so you can track it.", "لما ترسل تقديم، يطلع هنا عشان تتابعه.", "لما ترسلين تقديم، يطلع هنا عشان تتابعينه.")}</p>
        <Link className="btn btn-cta" href={`/${lang}/jobs`}><span className="ic"><Icon name="arrow" /></span>{t("Go to jobs", "روح للوظائف", "روحي للوظائف")}</Link>
      </div>
    );

  return (
    <>
      <div className="stats">
        {[
          [t("Sent", "انرسلت"), rows.length],
          [t("Replies", "ردود"), count("reply")],
          [t("Interviews", "مقابلات"), count("interview")],
          [t("Offers", "عروض"), count("offer")],
        ].map(([l, n]) => (
          <div className="stat" key={String(l)}><b>{n}</b><span>{l}</span></div>
        ))}
      </div>

      {due.map(({ application, job }) => {
        const text = `Dear Hiring Team,\n\nI applied for the ${job.title} role ${application.sentAt.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} and wanted to confirm my continued interest. I would be glad to share anything else that helps.\n\nBest regards,\n${name}`;
        return (
          <div className="reminder" key={application.id} style={{ display: "grid", gap: ".6rem" }}>
            <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
              <Icon name="bell" />
              <b>
                {t("Time to follow up with ", "وقت المتابعة مع ")}
                <span className="en">{companyOf(job, t)}</span>
              </b>
            </div>
            <textarea className="input" lang="en" dir="ltr" defaultValue={text} style={{ minHeight: "8rem" }} aria-label={t("Follow-up message", "رسالة المتابعة")} />
            <div className="row-btns">
              <CopyButton label={t("Copy message", "انسخ الرسالة", "انسخي الرسالة")} done={t("Copied", "انسخت")} />
              <form action={followedUpAction}>
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="applicationId" value={application.id} />
                <button className="btn btn-ghost">{t("I followed up", "تابعت", "تابعت")}</button>
              </form>
            </div>
          </div>
        );
      })}

      <div className="card">
        <div className="list">
          {rows.map(({ application, job }) => (
            <div className="item" key={application.id} style={{ flexWrap: "wrap" }}>
              <Mark name={job.company ?? job.title} />
              <Link className="grow" href={`/${lang}/jobs/${job.id}`} style={{ textDecoration: "none" }}>
                <b className="en">{job.title}</b>
                <span className="small muted"><span className="en">{companyOf(job, t)}</span> · {daysAgo(lang, application.sentAt)}</span>
              </Link>
              <form action={setStatusAction} style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="applicationId" value={application.id} />
                <StatusPill status={application.status} t={t} />
                <label className="sr-only" htmlFor={`st-${application.id}`}>{t("Status", "الحالة")}</label>
                <select id={`st-${application.id}`} className="input" name="status" defaultValue={application.status} style={{ width: "auto", padding: ".35rem .6rem", fontSize: ".85rem" }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s, t)}</option>)}
                </select>
                <button className="btn-text">{t("Update", "حدّث")}</button>
              </form>
            </div>
          ))}
        </div>
      </div>
      <p className="small muted">{t("Update the status when you hear back. Reading replies from your inbox comes with Plus later.", "حدّث الحالة لما يوصلك رد. قراءة الردود من بريدك تجي مع بلس لاحقاً.", "حدّثي الحالة لما يوصلك رد. قراءة الردود من بريدك تجي مع بلس لاحقاً.")}</p>
    </>
  );
}

export default async function ApplicationsPage({ params }: PageProps<"/[lang]/applications">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ar";
  return (
    <Page lang={lang} title={lang === "ar" ? "تقديماتي" : "Applications"}>
      <Applications lang={lang} />
    </Page>
  );
}
