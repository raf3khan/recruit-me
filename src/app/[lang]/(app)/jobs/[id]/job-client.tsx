"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import type { User } from "@/lib/db/schema";
import { translator, type Lang } from "@/lib/i18n";
import type { AddressForm, CoverLetter } from "@/lib/tailoring/schemas";
import { prepareAction, saveLetterAction, sendAction, skipAction, type FormState } from "../../../actions";

function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button, a, input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        {children}
      </div>
    </div>
  );
}

function SheetHead({ title, onClose, closeLabel }: { title: string; onClose: () => void; closeLabel: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
      <h2>{title}</h2>
      <button type="button" className="icon-btn" onClick={onClose} aria-label={closeLabel}>
        <Icon name="x" />
      </button>
    </div>
  );
}

export function Paywall({ lang, addressForm, reason, onClose }: { lang: Lang; addressForm: AddressForm; reason: string; onClose: () => void }) {
  const t = translator(lang, addressForm);
  return (
    <Sheet label={t("Go Plus", "الترقية")} onClose={onClose}>
      <SheetHead title={t("This is part of Plus", "هذي الميزة في بلس")} onClose={onClose} closeLabel={t("Close", "إغلاق")} />
      <div className="hero-card" style={{ background: "var(--lilac)" }}>
        <b>{reason}</b>
        <span className="small">
          {t("Plus gives you unlimited packs, email from your inbox and sharper writing.", "بلس يعطيك تجهيز بلا حدود، وإرسال إيميل من بريدك، وكتابة أدق.")}
        </span>
      </div>
      <Link className="btn btn-cta btn-block" href={`/${lang}/plans`}>
        <span className="ic"><Icon name="star" /></span>
        {t("See Plus", "شوف بلس", "شوفي بلس")}
      </Link>
      <button type="button" className="btn-text" onClick={onClose}>{t("Not now", "مو الحين")}</button>
    </Sheet>
  );
}

export function PrepareCard({ lang, addressForm, jobId, usageLine }: { lang: Lang; addressForm: AddressForm; jobId: string; usageLine: string }) {
  const t = translator(lang, addressForm);
  const [state, action, pending] = useActionState<FormState, FormData>(prepareAction, null);
  const [closed, setClosed] = useState(0);
  const showPaywall = state?.limit && closed === 0;
  return (
    <form action={(f) => { setClosed(0); action(f); }} className="card" style={{ textAlign: "center", display: "grid", gap: ".7rem", justifyItems: "center" }}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="jobId" value={jobId} />
      <span className="mark" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Icon name="spark" /></span>
      <h2>{t("Prepare your resume and letter?", "نجهّز لك السيرة والخطاب؟")}</h2>
      <p className="muted">
        {t("It takes under a minute and uses one pack from your allowance.", "التجهيز ياخذ أقل من دقيقة ويستخدم تجهيز واحد من رصيدك.")}
      </p>
      <p className="small">{usageLine}</p>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn btn-cta" disabled={pending}>
        <span className="ic">{pending ? <span className="spin" /> : <Icon name="spark" />}</span>
        {pending ? t("Preparing…", "نجهّز…") : t("Prepare", "جهّز", "جهّزي")}
      </button>
      {showPaywall && (
        <Paywall
          lang={lang}
          addressForm={addressForm}
          reason={t("You've used all your packs this month.", "استخدمت كل رصيدك هالشهر.", "استخدمتِ كل رصيدك هالشهر.")}
          onClose={() => setClosed(1)}
        />
      )}
    </form>
  );
}

type Method = "site" | "email" | "word";

export function JobActions(props: {
  lang: Lang;
  addressForm: AddressForm;
  jobId: string;
  jobUrl: string | null;
  company: string;
  plan: User["plan"];
  letter: CoverLetter;
  fullName: string;
  sent: boolean;
  resume: ReactNode;
}) {
  const { lang, addressForm, jobId, jobUrl, company, plan, letter, fullName, sent } = props;
  const t = translator(lang, addressForm);
  const [tab, setTab] = useState<"resume" | "letter">("resume");
  const [sheet, setSheet] = useState<null | "send" | "paywall">(null);
  const [method, setMethod] = useState<Method>(jobUrl ? "site" : "word");
  const [sending, startSending] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const letterForm = useRef<HTMLFormElement>(null);

  const docx = (kind: "resume" | "letter") => `/api/jobs/${jobId}/docx?kind=${kind}`;

  const confirm = (form: FormData) => {
    if (method === "site" && jobUrl) window.open(jobUrl, "_blank", "noopener");
    if (method === "word") {
      // Anchors with `download` save the files without navigating away from the page.
      for (const kind of ["resume", "letter"] as const) {
        const a = document.createElement("a");
        a.href = docx(kind);
        a.download = "";
        document.body.append(a);
        a.click();
        a.remove();
      }
    }
    startSending(async () => {
      const result = await sendAction(null, form);
      if (result?.limit) setSheet("paywall");
      else if (result?.error) setSendError(result.error);
      else setSheet(null);
    });
  };

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div className="seg" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "resume"} onClick={() => setTab("resume")}>{t("Resume", "السيرة")}</button>
            <button type="button" role="tab" aria-selected={tab === "letter"} onClick={() => setTab("letter")}>{t("Letter", "الخطاب")}</button>
          </div>
          <a className="btn-text" href={docx(tab)}>{t("Word file", "ملف وورد")}</a>
        </div>
        <div hidden={tab !== "resume"}>{props.resume}</div>
        <form
          hidden={tab !== "letter"}
          ref={letterForm}
          action={async (f) => { await saveLetterAction(f); setSaved(true); }}
          className="letter"
          lang="en"
          onChange={() => setSaved(false)}
        >
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="jobId" value={jobId} />
          <p className="small muted" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang} style={{ textAlign: "start" }}>
            {t("Edit any paragraph, then save. We never add facts that aren't in your profile.", "عدّل أي فقرة ثم احفظ. ما نضيف معلومة مو في ملفك.", "عدّلي أي فقرة ثم احفظي. ما نضيف معلومة مو في ملفك.")}
          </p>
          <input className="input" name="greeting" defaultValue={letter.greeting} aria-label="Greeting" />
          {letter.paragraphs.map((p, i) => (
            <textarea key={i} className="input" name="paragraph" defaultValue={p} aria-label={`Paragraph ${i + 1}`} />
          ))}
          <input className="input" name="closing" defaultValue={letter.closing} aria-label="Closing" />
          <p>{fullName}</p>
          <div className="row-btns" dir={lang === "ar" ? "rtl" : "ltr"}>
            <button className="btn btn-ghost">{t("Save letter", "احفظ الخطاب", "احفظي الخطاب")}</button>
            {saved && <span className="small muted" role="status">{t("Saved", "انحفظ")}</span>}
          </div>
        </form>
      </div>

      {sent ? (
        <div className="sticky-actions">
          <Link className="btn btn-ghost" href={`/${lang}/applications`}>{t("View in Applications", "شوفها في تقديماتي", "شوفيها في تقديماتي")}</Link>
        </div>
      ) : (
        <div className="sticky-actions">
          <form action={skipAction} style={{ flex: 1, display: "flex" }}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="jobId" value={jobId} />
            <button className="btn btn-ghost" style={{ flex: 1 }}>{t("Skip", "تخطي")}</button>
          </form>
          <button
            type="button"
            className="btn btn-cta"
            onClick={() => {
              letterForm.current?.requestSubmit();
              setSheet("send");
            }}
          >
            <span className="ic"><Icon name="send" /></span>
            {t("Send application", "أرسل التقديم", "أرسلي التقديم")}
          </button>
        </div>
      )}

      {sheet === "send" && (
        <Sheet label={t("Send", "إرسال")} onClose={() => setSheet(null)}>
          <form action={confirm} style={{ display: "grid", gap: "1rem" }}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="method" value={method} />
            <SheetHead title={t(`Send to ${company}`, `إرسال لـ ${company}`)} onClose={() => setSheet(null)} closeLabel={t("Close", "إغلاق")} />
            <p className="muted small">
              {t("Choose how to send. Nothing goes out until you confirm.", "اختر طريقة الإرسال. ما يطلع شي إلا لما تأكد.", "اختاري طريقة الإرسال. ما يطلع شي إلا لما تأكدين.")}
            </p>
            {jobUrl && (
              <button type="button" className="option" aria-pressed={method === "site"} onClick={() => setMethod("site")}>
                <span className="oi"><Icon name="ext" /></span>
                <span style={{ flex: 1 }}>
                  <b>{t("Apply on the company site", "قدّم من موقع الشركة", "قدّمي من موقع الشركة")}</b>
                  <span className="small muted" style={{ display: "block" }}>{t("We open the ad; attach the Word files there.", "نفتح الإعلان، وترفق ملفات الوورد هناك.", "نفتح الإعلان، وترفقين ملفات الوورد هناك.")}</span>
                </span>
              </button>
            )}
            <button type="button" className="option" aria-pressed={method === "word"} onClick={() => setMethod("word")}>
              <span className="oi"><Icon name="doc" /></span>
              <span style={{ flex: 1 }}>
                <b>{t("Download Word files", "حمّل ملفات وورد", "حمّلي ملفات وورد")}</b>
                <span className="small muted" style={{ display: "block" }}>{t("and apply yourself", "وقدّم بنفسك", "وقدّمي بنفسك")}</span>
              </span>
            </button>
            <button
              type="button"
              className="option"
              aria-pressed={method === "email"}
              onClick={() => (plan === "plus" ? setMethod("email") : setSheet("paywall"))}
            >
              <span className="oi"><Icon name={plan === "plus" ? "mail" : "lock"} /></span>
              <span style={{ flex: 1 }}>
                <b>{t("Email the hiring manager", "إيميل لمسؤول التوظيف")}</b>
                <span className="small muted" style={{ display: "block" }}>{t("From your own inbox. Coming soon.", "من بريدك أنت. قريباً.")}</span>
              </span>
              <span className="tag plus">{t("Plus", "بلس")}</span>
            </button>
            {sendError && <p className="error" role="alert">{sendError}</p>}
            <button className="btn btn-cta btn-block" disabled={sending || method === "email"}>
              <span className="ic">{sending ? <span className="spin" /> : <Icon name="send" />}</span>
              {t("Confirm", "تأكيد")}
            </button>
            <p className="small muted">{t("We'll mark it as sent and remind you to follow up in 5 days.", "نسجّله كمُرسل ونذكّرك بالمتابعة بعد 5 أيام.")}</p>
          </form>
        </Sheet>
      )}
      {sheet === "paywall" && (
        <Paywall
          lang={lang}
          addressForm={addressForm}
          reason={t("Emailing from your inbox is part of Plus.", "الإرسال بالإيميل من بريدك متاح في بلس.")}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}
