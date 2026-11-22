import { Logo } from "@/components/page";
import { LangSwitch } from "@/components/lang-switch";
import { isLang } from "@/lib/i18n";
import { SignupForm } from "./signup-form";

/** Sign-up and sign-in are the same: a phone number and a code. Copy here is gender-neutral. */
export default async function Signup({ params }: PageProps<"/[lang]/signup">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ar";
  return (
    <div className="auth">
      <div className="auth-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo lang={lang} />
          <LangSwitch lang={lang} />
        </div>
        <SignupForm lang={lang} />
      </div>
    </div>
  );
}
