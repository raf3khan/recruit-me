import { isTestMode } from "@/lib/mode";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { FitTag, Mark, StatusPill, companyOf } from "@/components/job-bits";
import { Page } from "@/components/page";
import { requireUser } from "@/lib/auth/current";
import { listJobs } from "@/lib/app/service";
import { usageFor } from "@/lib/app/usage";
import { getDb } from "@/lib/db";
import { isLang, jobsCount, packsCount, translator, type Lang } from "@/lib/i18n";
import { loadSampleJobsAction } from "../../actions";
import { AddJobForm } from "./add-job-form";

async function Jobs({ lang }: { lang: Lang }) {
  const user = await requireUser(lang);
  const t = translator(lang, user.addressForm);
  const db = await getDb();
  const [rows, usage] = await Promise.all([listJobs(db, user), usageFor(db, user)]);
  const open = rows.filter((r) => !r.application);

  return (
    <>
      <div className="hero-card">
        <h2>
          {rows.length === 0
            ? t("Add your first job", "أضف أول وظيفة", "أضيفي أول وظيفة")
            : t(`${jobsCount("en", open.length)} waiting for you`, `${jobsCount("ar", open.length)} تنتظرك`, `${jobsCount("ar", open.length)} تنتظرك`)}
        </h2>
        <p>
          {t(
            "Paste a job you found. We prepare a resume and letter for it; you review and send.",
            "الصق أي وظيفة لقيتها. نجهّز لها سيرة وخطاب، وأنت تراجع وترسل.",
            "الصقي أي وظيفة لقيتيها. نجهّز لها سيرة وخطاب، وأنتِ تراجعين وترسلين.",
          )}
        </p>
        {usage.limit !== null && (
          <div style={{ maxWidth: "20rem", display: "grid", gap: ".35rem" }}>
            <span className="small">
              {t(
                `${usage.used} of ${packsCount("en", usage.limit)} used this month`,
                `استخدمت ${usage.used} من ${packsCount("ar", usage.limit)} هالشهر`,
                `استخدمتِ ${usage.used} من ${packsCount("ar", usage.limit)} هالشهر`,
              )}
            </span>
            <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={usage.limit} aria-valuenow={usage.used}>
              <span style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="card">
          <div className="list">
            {rows.map(({ job, pack, application }) => (
              <Link key={job.id} className="item" href={`/${lang}/jobs/${job.id}`}>
                <Mark name={job.company ?? job.title} />
                <span className="grow">
                  <b className="en">{job.title}</b>
                  <span className="small muted">
                    <span className="en">{companyOf(job, t)}</span>
                    {job.location ? ` · ${job.location}` : ""}
                  </span>
                  <span className="tags">
                    <FitTag fit={job.fit} t={t} />
                    {job.source === "sample" && <span className="tag">{t("Sample", "تجريبية")}</span>}
                  </span>
                </span>
                {application ? (
                  <StatusPill status={application.status} t={t} />
                ) : pack ? (
                  <span className="tag fit">{t("Ready", "جاهز")}</span>
                ) : (
                  <span className="tag">{t("Not prepared", "يحتاج تجهيز")}</span>
                )}
                <span className="chev"><Icon name="chev" /></span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <details className="card" open={rows.length === 0}>
        <summary>
          <span style={{ display: "inline-flex", gap: ".5rem", alignItems: "center" }}>
            <Icon name="plus" />
            {t("Add a job", "أضف وظيفة", "أضيفي وظيفة")}
          </span>
        </summary>
        <AddJobForm lang={lang} addressForm={user.addressForm} />
      </details>

      {isTestMode() && rows.length === 0 && (
        <form action={loadSampleJobsAction} className="dev">
          <input type="hidden" name="lang" value={lang} />
          {t("Development only: ", "للتطوير فقط: ")}
          <button className="btn-text">{t("load 5 made-up sample jobs", "أضف 5 وظائف تجريبية وهمية")}</button>
        </form>
      )}
    </>
  );
}

export default async function JobsPage({ params }: PageProps<"/[lang]/jobs">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ar";
  return (
    <Page lang={lang} title={lang === "ar" ? "الوظائف" : "Jobs"}>
      <Jobs lang={lang} />
    </Page>
  );
}
