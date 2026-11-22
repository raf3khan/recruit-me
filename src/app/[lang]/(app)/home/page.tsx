import Link from "next/link";
import { Icon } from "@/components/icon";
import { FitTag, Mark, companyOf } from "@/components/job-bits";
import { Page } from "@/components/page";
import { requireUser } from "@/lib/auth/current";
import { listApplications, listJobs, needsFollowUp } from "@/lib/app/service";
import { getDb } from "@/lib/db";
import { days, daysSince, isLang, jobsCount, translator, type Lang } from "@/lib/i18n";

/**
 * The assistant's home: a short thread built from the user's own data (jobs
 * ready to review, follow-ups due). Free-text chat with the assistant comes later.
 */
async function Assistant({ lang }: { lang: Lang }) {
  const user = await requireUser(lang);
  const t = translator(lang, user.addressForm);
  const db = await getDb();
  const [jobs, apps] = await Promise.all([listJobs(db, user), listApplications(db, user)]);
  const ready = jobs.filter((r) => r.pack && !r.application);
  const unprepared = jobs.filter((r) => !r.pack && !r.application);
  const due = apps.filter((a) => needsFollowUp(a.application));
  const first = (user.profile?.fullName ?? "").split(/\s+/)[0];
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Riyadh" }).format(new Date()));
  const hello = hour < 12 ? t("Good morning", "صباح الخير") : t("Good evening", "مساء الخير");

  return (
    <>
      <div className="chat" aria-live="polite">
        <div className="msg them">
          {hello}
          {first ? ` ${first}` : ""} ☀️{" "}
          {jobs.length === 0
            ? t("Add a job you found and I'll prepare your resume and letter for it.", "أضف أي وظيفة لقيتها وأجهّز لك السيرة والخطاب لها.", "أضيفي أي وظيفة لقيتيها وأجهّز لك السيرة والخطاب لها.")
            : ready.length > 0
              ? t(`${jobsCount("en", ready.length)} ready for you to review.`, `عندك ${jobsCount("ar", ready.length)} جاهزة للمراجعة.`)
              : unprepared.length > 0
                ? t(`${jobsCount("en", unprepared.length)} waiting to be prepared.`, `عندك ${jobsCount("ar", unprepared.length)} تنتظر التجهيز.`)
                : t("You're up to date.", "كل شي محدّث.")}
        </div>
        {[...ready, ...unprepared].slice(0, 3).map(({ job, pack }) => (
          <Link key={job.id} className="jobmsg" href={`/${lang}/jobs/${job.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <Mark name={job.company ?? job.title} size="2.3rem" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b className="en">{job.title}</b>
              <div className="small muted"><span className="en">{companyOf(job, t)}</span></div>
              <div style={{ display: "flex", gap: ".3rem", marginTop: ".35rem", flexWrap: "wrap" }}>
                <FitTag fit={job.fit} t={t} />
                <span className="tag">{pack ? t("Resume + letter ready", "السيرة والخطاب جاهزين") : t("Not prepared", "يحتاج تجهيز")}</span>
              </div>
            </div>
            <span className="chev" style={{ alignSelf: "center" }}><Icon name="chev" /></span>
          </Link>
        ))}
        {due.map(({ application, job }) => {
          const n = daysSince(application.sentAt);
          return (
            <div key={application.id} className="msg them">
              {t(
                `Reminder: you applied to ${companyOf(job, t)} ${days("en", n)} ago. A short follow-up helps.`,
                `تذكير: صار ${days("ar", n)} من تقديمك على ${companyOf(job, t)}. رسالة متابعة قصيرة تفرق.`,
              )}{" "}
              <Link className="btn-text" href={`/${lang}/applications`}>{t("Draft it", "جهّزها لي")}</Link>
            </div>
          );
        })}
      </div>
      <div className="chips">
        <Link className="chip" href={`/${lang}/jobs`}>{t("Add a job", "أضف وظيفة", "أضيفي وظيفة")}</Link>
        <Link className="chip" href={`/${lang}/applications`}>{t("My applications", "تقديماتي")}</Link>
        <Link className="chip" href={`/${lang}/profile`}>{t("Edit my preferences", "عدّل تفضيلاتي", "عدّلي تفضيلاتي")}</Link>
      </div>
      <p className="small muted">{t("Chatting with the assistant is coming soon.", "المحادثة مع المساعد قريباً.")}</p>
    </>
  );
}

export default async function Home({ params }: PageProps<"/[lang]/home">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ar";
  return (
    <Page lang={lang} title={lang === "ar" ? "المساعد" : "Assistant"}>
      <Assistant lang={lang} />
    </Page>
  );
}
