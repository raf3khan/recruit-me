"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { translator, type Lang } from "@/lib/i18n";
import type { AddressForm } from "@/lib/tailoring/schemas";
import { readCvAction, type FormState } from "../actions";

/** Paste a CV; the server reads it into structured facts. */
export function CvForm({ lang, addressForm, from }: { lang: Lang; addressForm: AddressForm; from: "onboard" | "profile" }) {
  const t = translator(lang, addressForm);
  const [state, action, pending] = useActionState<FormState, FormData>(readCvAction, null);
  return (
    <form action={action} style={{ display: "grid", gap: ".8rem" }}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="from" value={from} />
      <textarea
        className="input"
        name="cv"
        dir="auto"
        style={{ minHeight: "12rem" }}
        placeholder={t("Name, education, internships, projects, skills…", "الاسم، التعليم، التدريب، المشاريع، المهارات…")}
        aria-label={t("CV text", "نص السيرة")}
        required
        minLength={50}
        maxLength={30000}
      />
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn btn-cta" disabled={pending}>
        <span className="ic">{pending ? <span className="spin" /> : <Icon name="spark" />}</span>
        {pending ? t("Reading your CV…", "نقرأ سيرتك…") : t("Read my CV", "اقرأ سيرتي")}
      </button>
      <p className="small muted">{t("Uploading PDF and Word files is coming next.", "رفع ملفات PDF و Word قريباً.")}</p>
    </form>
  );
}
