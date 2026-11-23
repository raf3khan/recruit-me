"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { translator, type Lang } from "@/lib/i18n";
import type { AddressForm } from "@/lib/tailoring/schemas";
import { deleteAccountAction } from "../../actions";

export function DeleteAccount({ lang, addressForm }: { lang: Lang; addressForm: AddressForm }) {
  const t = translator(lang, addressForm);
  const [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <button type="button" className="item" style={{ color: "#b42318" }} onClick={() => setConfirming(true)}>
        <Icon name="trash" />
        <span className="grow"><b>{t("Delete my account", "احذف حسابي", "احذفي حسابي")}</b></span>
      </button>
    );
  return (
    <form action={deleteAccountAction} className="warnbox" style={{ display: "grid", gap: ".6rem", marginTop: ".5rem" }}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="confirm" value="yes" />
      <b>{t("Are you sure?", "متأكد؟", "متأكدة؟")}</b>
      <span>{t("This deletes your profile, resumes, jobs and applications right away. It can't be undone.", "نحذف ملفك وسيرك ووظائفك وتقديماتك فوراً. وما نقدر نرجعها.")}</span>
      <div className="row-btns">
        <button className="btn btn-danger">{t("Delete my account", "احذف حسابي", "احذفي حسابي")}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>{t("No, go back", "لا، رجوع")}</button>
      </div>
    </form>
  );
}
