import { Page } from "@/components/page";
import { requireUser } from "@/lib/auth/current";
import { FREE_MONTHLY_PACKS, usageFor } from "@/lib/app/usage";
import { getDb } from "@/lib/db";
import { isLang, packsCount, translator, type Lang } from "@/lib/i18n";
import { devSetPlanAction } from "../../actions";

async function Plans({ lang }: { lang: Lang }) {
  const user = await requireUser(lang);
  const t = translator(lang, user.addressForm);
  const usage = await usageFor(await getDb(), user);
  const plus = user.plan === "plus";
  return (
    <>
      <div className="card" style={{ display: "grid", gap: ".5rem" }}>
        <b>{plus ? t("You're on Plus", "أنت على باقة بلس", "أنتِ على باقة بلس") : t("Your allowance this month", "رصيدك هالشهر")}</b>
        {usage.limit === null ? (
          <span>{t("Unlimited packs", "تجهيز بلا حدود")}</span>
        ) : (
          <>
            <span>
              {t(
                `${usage.used} of ${packsCount("en", usage.limit)} used`,
                `استخدمت ${usage.used} من ${packsCount("ar", usage.limit)}`,
                `استخدمتِ ${usage.used} من ${packsCount("ar", usage.limit)}`,
              )}
            </span>
            <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={usage.limit} aria-valuenow={usage.used}>
              <span style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} />
            </div>
            <span className="small muted">{t("Resets on the 1st of each month.", "يتجدد الرصيد أول كل شهر.")}</span>
          </>
        )}
      </div>
      <div className="grid2">
        <div className="plan">
          <h2>{t("Free", "مجانية")}</h2>
          <div className="price">{t("Free forever", "مجاناً دائماً")}</div>
          <ul>
            <li>{t(`${packsCount("en", FREE_MONTHLY_PACKS)} a month (resume + letter)`, `${packsCount("ar", FREE_MONTHLY_PACKS)} بالشهر (سيرة + خطاب)`)}</li>
            <li>{t("Tips for every application", "نصائح لكل تقديم")}</li>
            <li>{t("Application tracker and follow-up reminders", "متابعة التقديمات وتذكير بالمتابعة")}</li>
          </ul>
        </div>
        <div className="plan best">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>{t("Plus", "بلس")}</h2>
            <span className="tag plus">{t("Most useful", "الأكثر فائدة")}</span>
          </div>
          <div className="price">{t("SAR 49", "49 ريال")} <small>{t("/ month", "/ شهرياً")}</small></div>
          <ul>
            <li>{t("Unlimited packs", "تجهيز بلا حدود")}</li>
            <li>{t("Sharper writing with a stronger model", "كتابة أدق بنموذج أقوى")}</li>
            <li>{t("Email the hiring manager from your inbox (coming soon)", "إيميل لمسؤول التوظيف من بريدك (قريباً)")}</li>
          </ul>
          <button className="btn btn-cta" disabled>{plus ? t("Your current plan", "باقتك الحالية") : t("Payments open soon", "الدفع يفتح قريباً")}</button>
        </div>
      </div>
      <p className="small muted" style={{ textAlign: "center" }}>{t("Prices and limits are placeholders until launch.", "الأسعار والحدود مبدئية لين الإطلاق.")}</p>
      {process.env.NODE_ENV !== "production" && (
        <form action={devSetPlanAction} className="dev" style={{ display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="plan" value={plus ? "free" : "plus"} />
          {t("Development only: payments aren't connected.", "للتطوير فقط: الدفع مو مربوط.")}
          <button className="btn-text">{plus ? t("Switch back to Free", "ارجع للمجانية") : t("Switch to Plus for testing", "حوّل لبلس للتجربة")}</button>
        </form>
      )}
    </>
  );
}

export default async function PlansPage({ params }: PageProps<"/[lang]/plans">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ar";
  return (
    <Page lang={lang} title={lang === "ar" ? "الباقات" : "Plans"}>
      <Plans lang={lang} />
    </Page>
  );
}
