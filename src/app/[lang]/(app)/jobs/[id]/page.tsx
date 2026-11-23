import { notFound } from "next/navigation";
import { FitTag, Mark, StatusPill, companyOf } from "@/components/job-bits";
import { Suspense } from "react";
import { Loading, Page } from "@/components/page";
import { ResumePreview } from "@/components/resume-preview";
import { requireUser } from "@/lib/auth/current";
import { getJob, NotFound } from "@/lib/app/service";
import { usageFor } from "@/lib/app/usage";
import { getDb } from "@/lib/db";
import { isLang, packsCount, translator, type Lang } from "@/lib/i18n";
import { JobActions, PrepareCard } from "./job-client";

async function Review({ lang, params }: { lang: Lang; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(lang);
  const t = translator(lang, user.addressForm);
  const db = await getDb();
  let row;
  try {
    row = await getJob(db, user, id);
  } catch (error) {
    if (error instanceof NotFound) notFound();
    throw error;
  }
  const { job, pack, application } = row;
  const usage = await usageFor(db, user);

  const head = (
    <div className="card" style={{ display: "flex", gap: ".9rem", alignItems: "center" }}>
      <Mark name={job.company ?? job.title} size="3.2rem" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2><span className="en">{job.title}</span></h2>
        <div className="muted">
          <span className="en">{companyOf(job, t)}</span>
          {job.location ? ` · ${job.location}` : ""}
        </div>
        <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap", marginTop: ".35rem" }}>
          <FitTag fit={job.fit} t={t} />
          {application && <StatusPill status={application.status} t={t} />}
        </div>
      </div>
    </div>
  );

  if (!pack) {
    const usageLine =
      usage.limit === null
        ? t("Plus: unlimited packs", "بلس: تجهيز بلا حدود")
        : t(
            `${usage.used} of ${packsCount("en", usage.limit)} used this month`,
            `استخدمت ${usage.used} من ${packsCount("ar", usage.limit)} هالشهر`,
            `استخدمتِ ${usage.used} من ${packsCount("ar", usage.limit)} هالشهر`,
          );
    return (
      <>
        {head}
        <PrepareCard lang={lang} addressForm={user.addressForm} jobId={job.id} usageLine={usageLine} />
        <details className="card">
          <summary>{t("Job description", "وصف الوظيفة")}</summary>
          <p dir="auto" style={{ whiteSpace: "pre-wrap", marginTop: ".75rem" }} className="small">{job.description}</p>
        </details>
      </>
    );
  }

  const p = pack.pack;
  return (
    <>
      {head}
      <div className="card why">
        <div className="card-head"><h2>{t("Why it fits", "ليش تناسبك")}</h2></div>
        {p.coverage.length + p.gaps.length > 0 ? (
          <ul lang="en" dir="ltr" style={{ textAlign: "start" }}>
            {p.coverage.map((c) => <li key={c.requirement} className="ok">{c.requirement}</li>)}
            {p.gaps.map((g) => <li key={g} className="gap">{g}</li>)}
          </ul>
        ) : (
          <p className="muted">{t("No requirements matched yet.", "ما لقينا متطلبات نقارنها بملفك بعد.")}</p>
        )}
      </div>
      {p.adviceAr.length > 0 && (
        <div className="advice" lang="ar" dir="rtl">
          <b>{lang === "ar" ? "نصائح: " : "نصائح (Tips, in Arabic): "}</b>
          <ul style={{ margin: ".3rem 0 0", paddingInlineStart: "1.2rem" }}>
            {p.adviceAr.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>
      )}
      {p.warnings.length > 0 && (
        <div className="warnbox">
          <b>{t("We removed or changed these because they aren't in your profile:", "شلنا أو عدّلنا هالأشياء لأنها مو موجودة في ملفك:")}</b>
          <ul lang="en" dir="ltr" style={{ margin: ".3rem 0 0", textAlign: "start" }}>
            {p.warnings.map((w) => <li key={w.message}>{w.message}</li>)}
          </ul>
        </div>
      )}
      <JobActions
        lang={lang}
        addressForm={user.addressForm}
        jobId={job.id}
        jobUrl={job.url}
        company={companyOf(job, t)}
        plan={user.plan}
        letter={pack.letter}
        fullName={p.resume.fullName}
        sent={Boolean(application)}
        resume={<ResumePreview doc={p.resume} />}
      />
    </>
  );
}

async function JobPageBody({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ar";
  return (
    <Page lang={lang} title={lang === "ar" ? "مراجعة وإرسال" : "Review and send"} back={`/${lang}/jobs`}>
      <Review lang={lang} params={params} />
    </Page>
  );
}

/** The job id is only known at request time, so the whole page streams in. */
export default function JobPage({ params }: PageProps<"/[lang]/jobs/[id]">) {
  return (
    <Suspense fallback={<main className="content"><Loading /></main>}>
      <JobPageBody params={params} />
    </Suspense>
  );
}
