import { isTestMode } from "@/lib/mode";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/page";
import { LangSwitch } from "@/components/lang-switch";
import { PrefsFields } from "@/components/prefs-fields";
import { requireUser } from "@/lib/auth/current";
import { isLang, translator, type Lang } from "@/lib/i18n";
import { savePreferencesAction, setAddressAction, sampleCvAction } from "../actions";
import { CvForm } from "./cv-form";

const STEPS = ["address", "cv", "check", "prefs", "done"] as const;
type Step = (typeof STEPS)[number];

async function Onboarding({ lang, step }: { lang: Lang; step: Step }) {
  const user = await requireUser(lang, { onboarded: false });
  // Ask the form of address first; until then the copy is neutral.
  const current: Step = user.addressForm === "neutral" ? "address" : !user.profile && step !== "address" ? "cv" : step;
  const t = translator(lang, user.addressForm);
  const index = STEPS.indexOf(current);
  const p = user.profile;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        {index > 0 && index < 4 ? (
          <Link className="icon-btn" href={`/${lang}/onboard?step=${STEPS[index - 1]}`} aria-label={t("Back", "رجوع")}>
            <Icon name="back" />
          </Link>
        ) : (
          <Logo lang={lang} name={false} />
        )}
        <div className="steps" role="img" aria-label={t(`Step ${index + 1} of 5`, `الخطوة ${index + 1} من 5`)} style={{ flex: 1 }}>
          {STEPS.map((s, i) => (
            <span key={s} className={i <= index ? "on" : undefined} />
          ))}
        </div>
        <LangSwitch lang={lang} />
      </div>

      {current === "address" && (
        <form action={setAddressAction} style={{ display: "grid", gap: "1rem" }}>
          <input type="hidden" name="lang" value={lang} />
          <h1>{t("How should we address you?", "كيف نخاطبك؟")}</h1>
          <p className="muted">
            {t(
              "Arabic changes with gender, so we ask how to speak to you in the app and in your tips. You can change it later in Account.",
              "العربي يفرق بين المذكر والمؤنث، فنبي نكلمك بالطريقة الصحيحة في التطبيق والنصائح. وممكن تغييرها لاحقاً من صفحة الحساب.",
            )}
          </p>
          {([
            ["masculine", "أنتَ", "جاهز؟ أرسل التقديم"],
            ["feminine", "أنتِ", "جاهزة؟ أرسلي التقديم"],
          ] as const).map(([v, label, ex]) => (
            <label key={v} className="option">
              <input type="radio" name="address" value={v} required defaultChecked={user.addressForm === v} />
              <span className="oi" style={{ fontWeight: 700 }} lang="ar">{label}</span>
              <span style={{ flex: 1 }}>
                <span className="small muted" style={{ display: "block" }}>
                  {t("For example: ", "مثل: ")}
                  <span lang="ar">«{ex}»</span>
                </span>
              </span>
            </label>
          ))}
          <button className="btn btn-cta"><span className="ic"><Icon name="arrow" /></span>{t("Next", "التالي")}</button>
        </form>
      )}

      {current === "cv" && (
        <>
          <h1>{t("Add your resume", "أضف سيرتك الذاتية", "أضيفي سيرتك الذاتية")}</h1>
          <p className="muted">
            {t(
              "Paste your CV text, in Arabic or English. We pull out your details and never add anything that isn't in it.",
              "الصق نص سيرتك، بالعربي أو الإنجليزي. نطلّع منها معلوماتك، وما نضيف شي مو موجود فيها.",
              "الصقي نص سيرتك، بالعربي أو الإنجليزي. نطلّع منها معلوماتك، وما نضيف شي مو موجود فيها.",
            )}
          </p>
          <CvForm lang={lang} addressForm={user.addressForm} from="onboard" />
          {isTestMode() && (
            <form action={sampleCvAction}>
              <input type="hidden" name="lang" value={lang} />
              <button className="btn-text">{t("Development: use the sample CV", "للتطوير: استخدم السيرة التجريبية")}</button>
            </form>
          )}
        </>
      )}

      {current === "check" && p && (
        <>
          <h1>{t("Check your details", "تأكد من معلوماتك", "تأكدي من معلوماتك")}</h1>
          <p className="muted">
            {t(
              "This is what we read from your resume. Everything we write later is based on it.",
              "هذا اللي قرأناه من سيرتك. كل شي نكتبه لاحقاً يعتمد عليه.",
            )}
          </p>
          <div className="card" style={{ padding: ".5rem 1rem" }}>
            {[
              [t("Name", "الاسم"), p.fullName],
              [t("Education", "التعليم"), p.education.map((e) => [e.degree, e.field, e.endDate].filter(Boolean).join(" · ")).join(" / ")],
              [t("Experience", "الخبرة"), p.experience.map((e) => `${e.role}, ${e.organization}`).join(" / ")],
              [t("Projects", "المشاريع"), p.projects.map((x) => x.name).join(" / ")],
              [t("Skills", "المهارات"), p.skills.join(", ")],
              [t("Languages", "اللغات"), p.languages.map((l) => `${l.name} (${l.level})`).join(", ")],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div className="fact" key={k}>
                  <span className="ok-ic"><Icon name="check" /></span>
                  <div>
                    <span className="small muted">{k}</span>
                    <div className="en">{v}</div>
                  </div>
                </div>
              ))}
          </div>
          <div className="row-btns">
            <Link className="btn btn-cta" href={`/${lang}/onboard?step=prefs`}>
              <span className="ic"><Icon name="check" /></span>
              {t("Looks right", "صحيحة")}
            </Link>
            <Link className="btn btn-ghost" href={`/${lang}/onboard?step=cv`}>{t("Paste again", "الصق من جديد", "الصقي من جديد")}</Link>
          </div>
          <p className="small muted">{t("You can edit any detail later in Profile.", "تقدر تعدّل أي معلومة بعدين من صفحة ملفي.", "تقدرين تعدّلين أي معلومة بعدين من صفحة ملفي.")}</p>
        </>
      )}

      {current === "prefs" && (
        <form action={savePreferencesAction} style={{ display: "grid", gap: "1rem" }}>
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="from" value="onboard" />
          <h1>{t("What are you looking for?", "وش تدور عليه؟", "وش تدورين عليه؟")}</h1>
          <p className="muted">{t("We use this to pick your jobs. Change it any time.", "نختار وظائفك على هالأساس. تقدر تغيّرها بأي وقت.", "نختار وظائفك على هالأساس. تقدرين تغيّرينها بأي وقت.")}</p>
          <PrefsFields lang={lang} t={t} prefs={user.preferences} />
          <button className="btn btn-cta"><span className="ic"><Icon name="arrow" /></span>{t("Next", "التالي")}</button>
        </form>
      )}

      {current === "done" && (
        <>
          <div className="drop" style={{ borderColor: "transparent", background: "var(--mint)" }}>
            <span className="big"><Icon name="check" /></span>
            <h1>{t("All set", "كل شي جاهز")}</h1>
            <p>
              {t(
                "Add a job you found and we'll prepare a tailored resume and letter for it. Daily matched jobs are coming soon.",
                "أضف أي وظيفة لقيتها ونجهّز لك سيرة وخطاب مفصّلين عليها. والوظائف اليومية المناسبة لك قريباً.",
                "أضيفي أي وظيفة لقيتيها ونجهّز لك سيرة وخطاب مفصّلين عليها. والوظائف اليومية المناسبة لك قريباً.",
              )}
            </p>
            <p className="small muted">{t("We never send an application without your approval.", "ما نرسل أي تقديم بدون موافقتك.")}</p>
          </div>
          <Link className="btn btn-cta" href={`/${lang}/jobs`}>
            <span className="ic"><Icon name="arrow" /></span>
            {t("Go to jobs", "روح للوظائف", "روحي للوظائف")}
          </Link>
        </>
      )}
    </>
  );
}

export default async function Onboard({ params, searchParams }: PageProps<"/[lang]/onboard">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ar";
  return (
    <div className="auth">
      <div className="auth-card">
        <Suspense fallback={<div className="skeleton" />}>
          <StepFromQuery lang={lang} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function StepFromQuery({ lang, searchParams }: { lang: Lang; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).step;
  const step = (STEPS as readonly string[]).includes(String(raw)) ? (raw as Step) : "address";
  return <Onboarding lang={lang} step={step} />;
}
