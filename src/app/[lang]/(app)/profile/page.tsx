import { Page } from "@/components/page";
import { PrefsFields } from "@/components/prefs-fields";
import { requireUser } from "@/lib/auth/current";
import { isLang, translator, type Lang } from "@/lib/i18n";
import { savePreferencesAction } from "../../actions";
import { CvForm } from "../../onboard/cv-form";
import { ProfileEditor } from "./profile-editor";

async function Profile({ lang }: { lang: Lang }) {
  const user = await requireUser(lang);
  const t = translator(lang, user.addressForm);
  return (
    <>
      <p className="small muted">
        {t(
          "Every resume and letter we write uses only these facts. Fix anything that's wrong.",
          "كل سيرة وخطاب نكتبه يعتمد على هذي المعلومات فقط. عدّل أي شي غلط.",
          "كل سيرة وخطاب نكتبه يعتمد على هذي المعلومات فقط. عدّلي أي شي غلط.",
        )}
      </p>
      {user.profile && <ProfileEditor lang={lang} addressForm={user.addressForm} profile={user.profile} />}
      <details className="card">
        <summary>{t("Replace with a new CV", "استبدلها بسيرة جديدة", "استبدليها بسيرة جديدة")}</summary>
        <div style={{ marginTop: "1rem" }}>
          <CvForm lang={lang} addressForm={user.addressForm} from="profile" />
        </div>
      </details>
      <form action={savePreferencesAction} className="card" style={{ display: "grid", gap: "1rem" }}>
        <input type="hidden" name="lang" value={lang} />
        <div className="card-head" style={{ marginBottom: 0 }}><h2>{t("Job preferences", "تفضيلات الوظائف")}</h2></div>
        <PrefsFields lang={lang} t={t} prefs={user.preferences} />
        <button className="btn btn-ghost" style={{ justifySelf: "start" }}>{t("Save preferences", "احفظ التفضيلات", "احفظي التفضيلات")}</button>
      </form>
    </>
  );
}

export default async function ProfilePage({ params }: PageProps<"/[lang]/profile">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ar";
  return (
    <Page lang={lang} title={lang === "ar" ? "ملفي" : "Profile"}>
      <Profile lang={lang} />
    </Page>
  );
}
