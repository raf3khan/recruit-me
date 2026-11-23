import Link from "next/link";
import { Icon } from "@/components/icon";
import { Page } from "@/components/page";
import { requireUser } from "@/lib/auth/current";
import { isLang, translator, type Lang } from "@/lib/i18n";
import { logoutAction, notificationsAction, setAddressAction } from "../../actions";
import { DeleteAccount } from "./delete-account";

async function Account({ lang }: { lang: Lang }) {
  const user = await requireUser(lang);
  const t = translator(lang, user.addressForm);
  const n = user.notifications;
  return (
    <>
      <div className="card">
        <div className="card-head"><h2>{t("Language", "اللغة")}</h2></div>
        <div className="seg">
          <Link href="/ar/account" aria-current={lang === "ar" ? "page" : undefined} lang="ar">عربي</Link>
          <Link href="/en/account" aria-current={lang === "en" ? "page" : undefined} lang="en">English</Link>
        </div>
        <p className="small muted" style={{ marginTop: ".6rem" }}>
          {t("Resumes and letters are always in English for private-sector jobs.", "السيرة والخطاب يكونون بالإنجليزي دائماً لوظائف القطاع الخاص.")}
        </p>
      </div>

      <form action={setAddressAction} className="card">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="next" value="account" />
        <div className="card-head"><h2>{t("How we address you", "طريقة المخاطبة")}</h2></div>
        <div className="row-btns">
          <div className="seg">
            <label lang="ar"><input type="radio" name="address" value="masculine" defaultChecked={user.addressForm === "masculine"} />أنتَ</label>
            <label lang="ar"><input type="radio" name="address" value="feminine" defaultChecked={user.addressForm === "feminine"} />أنتِ</label>
          </div>
          <button className="btn-text">{t("Save", "احفظ", "احفظي")}</button>
        </div>
        <p className="small muted" style={{ marginTop: ".6rem" }}>{t("For the Arabic in the app and in your tips.", "للعربي في التطبيق والنصائح.")}</p>
      </form>

      <form action={notificationsAction} className="card">
        <input type="hidden" name="lang" value={lang} />
        <div className="card-head"><h2>{t("Notifications", "التنبيهات")}</h2></div>
        <div className="list">
          {([
            ["daily", t("Daily jobs", "وظائف اليوم"), t("Every morning, once the job feed is live", "كل صباح، لما تشتغل الوظائف اليومية")],
            ["followUp", t("Follow-up reminders", "تذكير المتابعة"), t("5 days after you apply", "بعد 5 أيام من التقديم")],
            ["weekly", t("Weekly email summary", "ملخص أسبوعي بالإيميل"), t("Every Sunday", "كل أحد")],
          ] as const).map(([k, label, hint]) => (
            <label className="item" key={k}>
              <span className="grow"><b>{label}</b><span className="small muted">{hint}</span></span>
              <input type="checkbox" name={k} defaultChecked={n[k]} style={{ width: "1.3rem", height: "1.3rem", accentColor: "var(--brand)" }} />
            </label>
          ))}
        </div>
        <button className="btn btn-ghost" style={{ marginTop: ".6rem" }}>{t("Save", "احفظ", "احفظي")}</button>
      </form>

      <div className="card">
        <div className="card-head"><h2>{t("Your data", "بياناتك")}</h2></div>
        <div className="list">
          <a className="item" href="/api/account/export" download>
            <Icon name="doc" />
            <span className="grow"><b>{t("Download a copy of your data", "حمّل نسخة من بياناتك", "حمّلي نسخة من بياناتك")}</b><span className="small muted">{t("Your profile, jobs and applications as a file", "ملفك ووظائفك وتقديماتك في ملف واحد")}</span></span>
            <span className="chev"><Icon name="chev" /></span>
          </a>
          <Link className="item" href={`/${lang}/plans`}>
            <Icon name="star" />
            <span className="grow"><b>{t("Plan", "الباقة")}</b><span className="small muted">{user.plan === "plus" ? t("Plus", "بلس") : t("Free", "مجانية")}</span></span>
            <span className="chev"><Icon name="chev" /></span>
          </Link>
          <form action={logoutAction}>
            <input type="hidden" name="lang" value={lang} />
            <button className="item"><Icon name="out" /><span className="grow"><b>{t("Log out", "تسجيل الخروج")}</b></span></button>
          </form>
          <DeleteAccount lang={lang} addressForm={user.addressForm} />
        </div>
      </div>
    </>
  );
}

export default async function AccountPage({ params }: PageProps<"/[lang]/account">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ar";
  return (
    <Page lang={lang} title={lang === "ar" ? "الحساب" : "Account"}>
      <Account lang={lang} />
    </Page>
  );
}
