"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import { translator, type Lang } from "@/lib/i18n";
import { requestCodeAction, verifyCodeAction, type FormState } from "../actions";

export function SignupForm({ lang }: { lang: Lang }) {
  const t = translator(lang);
  const [sent, request, requesting] = useActionState<FormState, FormData>(requestCodeAction, null);
  const [checked, verify, verifying] = useActionState<FormState, FormData>(verifyCodeAction, null);
  const [editing, setEditing] = useState(false);
  const phone = checked?.phone ?? sent?.phone;
  const onCode = !editing && sent?.ok && phone;

  if (!onCode)
    return (
      <form action={(f) => { setEditing(false); request(f); }} style={{ display: "grid", gap: "1.1rem" }}>
        <input type="hidden" name="lang" value={lang} />
        <h1>{t("Start with one step", "البداية بخطوة وحدة")}</h1>
        <p className="muted">
          {t(
            "Sign up or log in with your mobile number. We'll text you a code and never share your number.",
            "التسجيل والدخول برقم الجوال. نرسل لك رمز تحقق، وما نشارك رقمك مع أي جهة.",
          )}
        </p>
        <label className="field">
          {t("Mobile number", "رقم الجوال")}
          <div className="phone-in">
            <span>+966</span>
            <input className="input" name="phone" inputMode="tel" autoComplete="tel" placeholder="05X XXX XXXX" defaultValue={phone ?? ""} required />
          </div>
          <span className="small muted">{t("Other Gulf numbers: start with + and the country code.", "أرقام الخليج الثانية تُكتب بـ + ورمز الدولة.")}</span>
        </label>
        <label className="small" style={{ display: "flex", gap: ".5rem", alignItems: "flex-start" }}>
          <input type="checkbox" name="agree" required style={{ marginTop: ".3rem" }} />
          <span>
            {t(
              "I agree to the terms and privacy policy, including processing my CV to prepare applications.",
              "أوافق على الشروط وسياسة الخصوصية، ومنها معالجة سيرتي الذاتية لتجهيز التقديمات.",
            )}
          </span>
        </label>
        {sent?.error && <p className="error" role="alert">{sent.error}</p>}
        <button className="btn btn-cta btn-block" disabled={requesting}>
          <span className="ic">{requesting ? <span className="spin" /> : <Icon name="arrow" />}</span>
          {t("Send code", "إرسال الرمز")}
        </button>
      </form>
    );

  return (
    <form action={verify} style={{ display: "grid", gap: "1.1rem" }}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="phone" value={phone} />
      <h1>{t("Verification code", "رمز التحقق")}</h1>
      <p className="muted">
        {t("We sent a 4-digit code to ", "أرسلنا رمز من 4 أرقام إلى ")}
        <span className="en">{phone}</span>
      </p>
      {sent?.devCode && (
        <p className="dev">
          {t("Development mode: no SMS is sent. Your code is ", "وضع التطوير: ما ينرسل SMS. الرمز هو ")}
          <b className="en">{sent.devCode}</b>
        </p>
      )}
      <input
        className="input"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={4}
        pattern="[0-9٠-٩]{4}"
        aria-label={t("Code", "الرمز")}
        dir="ltr"
        style={{ textAlign: "center", fontSize: "1.6rem", letterSpacing: ".6em", fontWeight: 700 }}
        autoFocus
        required
      />
      {checked?.error && <p className="error" role="alert">{checked.error}</p>}
      <button className="btn btn-cta btn-block" disabled={verifying}>
        <span className="ic">{verifying ? <span className="spin" /> : <Icon name="check" />}</span>
        {t("Verify", "تحقّق")}
      </button>
      <button type="button" className="btn-text" onClick={() => setEditing(true)}>
        {t("Change number or resend", "تغيير الرقم أو إعادة الإرسال")}
      </button>
    </form>
  );
}
