"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { translator, type Lang } from "@/lib/i18n";
import type { AddressForm } from "@/lib/tailoring/schemas";
import { addJobAction, type FormState } from "../../actions";

export function AddJobForm({ lang, addressForm }: { lang: Lang; addressForm: AddressForm }) {
  const t = translator(lang, addressForm);
  const [state, action, pending] = useActionState<FormState, FormData>(addJobAction, null);
  return (
    <form action={action} style={{ display: "grid", gap: ".8rem", marginTop: "1rem" }}>
      <input type="hidden" name="lang" value={lang} />
      <div className="grid2">
        <label className="field">
          {t("Job title", "المسمى الوظيفي")}
          <input className="input" name="title" dir="auto" required maxLength={200} />
        </label>
        <label className="field">
          {t("Company", "الشركة")}
          <input className="input" name="company" dir="auto" maxLength={200} />
        </label>
        <label className="field">
          {t("City", "المدينة")}
          <input className="input" name="location" dir="auto" maxLength={200} />
        </label>
        <label className="field">
          {t("Link to the ad (optional)", "رابط الإعلان (اختياري)")}
          <input className="input" name="url" type="url" dir="ltr" maxLength={1000} placeholder="https://" />
        </label>
      </div>
      <label className="field">
        {t("Full job description", "وصف الوظيفة كامل")}
        <textarea className="input" name="description" dir="auto" style={{ minHeight: "10rem" }} required minLength={80} maxLength={20000} />
      </label>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn btn-cta" disabled={pending} style={{ justifySelf: "start" }}>
        <span className="ic">{pending ? <span className="spin" /> : <Icon name="plus" />}</span>
        {t("Add job", "أضف الوظيفة", "أضيفي الوظيفة")}
      </button>
    </form>
  );
}
