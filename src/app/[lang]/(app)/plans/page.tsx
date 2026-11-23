import { Page } from "@/components/page";
import { requireUser } from "@/lib/auth/current";
import { FREE_MONTHLY_PACKS, usageFor } from "@/lib/app/usage";
import { getDb } from "@/lib/db";
import { isLang, packsCount, translator, type Lang } from "@/lib/i18n";
import { getBillingProvider, latestSubscription, plansFor } from "@/lib/billing";
import { checkoutAction, devSetPlanAction, manageSubscriptionAction } from "../../actions";

async function Plans({ lang, searchParams }: { lang: Lang; searchParams: PageProps<"/[lang]/plans">["searchParams"] }) {
  const user = await requireUser(lang);
  const t = translator(lang, user.addressForm);
  const db = await getDb();
  const usage = await usageFor(db, user);
  const plus = user.plan === "plus";
  const { billing } = await searchParams;
  const subscription = await latestSubscription(db, user.id);
  const plans = plansFor(getBillingProvider().name);
  const monthly = plans.find((p) => p.id === "plus_monthly");
  const yearly = plans.find((p) => p.id === "plus_yearly");
  return (
    <>
      {billing === "success" && (
        <p className="card" role="status">
          {t(
            "Thanks for subscribing! Plus switches on as soon as the payment is confirmed, usually within a minute.",
            "شكراً لاشتراكك! تتفعّل بلس أول ما يتأكد الدفع، عادةً خلال دقيقة.",
          )}
        </p>
      )}
      {(billing === "error" || billing === "unavailable") && (
        <p className="error" role="alert">
          {t("We couldn't open the payment page. Try again shortly.", "ما قدرنا نفتح صفحة الدفع. جرّب بعد شوي.", "ما قدرنا نفتح صفحة الدفع. جرّبي بعد شوي.")}
        </p>
      )}
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
          <div className="price">
            {monthly?.displayPrice ?? t("SAR 49", "49 ريال")} <small>{t("/ month", "/ شهرياً")}</small>
          </div>
          <ul>
            <li>{t("Unlimited packs", "تجهيز بلا حدود")}</li>
            <li>{t("Sharper writing with a stronger model", "كتابة أدق بنموذج أقوى")}</li>
            <li>{t("Email the hiring manager from your inbox (coming soon)", "إيميل لمسؤول التوظيف من بريدك (قريباً)")}</li>
          </ul>
          {plus ? (
            subscription ? (
              <form action={manageSubscriptionAction}>
                <input type="hidden" name="lang" value={lang} />
                <button className="btn btn-ghost btn-block">{t("Manage subscription", "إدارة الاشتراك")}</button>
              </form>
            ) : (
              <button className="btn btn-cta btn-block" disabled>{t("Your current plan", "باقتك الحالية")}</button>
            )
          ) : monthly ? (
            <div style={{ display: "grid", gap: ".6rem" }}>
              <form action={checkoutAction}>
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="planId" value={monthly.id} />
                <button className="btn btn-cta btn-block">{t("Subscribe monthly", "اشترك شهرياً", "اشتركي شهرياً")}</button>
              </form>
              {yearly && (
                <form action={checkoutAction}>
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="planId" value={yearly.id} />
                  <button className="btn btn-ghost btn-block">
                    {t("Subscribe yearly", "اشترك سنوياً", "اشتركي سنوياً")}
                    {yearly.displayPrice ? ` · ${yearly.displayPrice}` : ""}
                  </button>
                </form>
              )}
              <span className="small muted">
                {t(
                  "Secure payment by Paddle with card, Apple Pay or Google Pay. Cancel any time.",
                  "الدفع آمن عن طريق Paddle بالبطاقة أو Apple Pay أو Google Pay. تقدر تلغي متى ما بغيت.",
                  "الدفع آمن عن طريق Paddle بالبطاقة أو Apple Pay أو Google Pay. تقدرين تلغين متى ما بغيتِ.",
                )}
              </span>
            </div>
          ) : (
            <button className="btn btn-cta btn-block" disabled>{t("Payments open soon", "الدفع يفتح قريباً")}</button>
          )}
        </div>
      </div>
      <p className="small muted" style={{ textAlign: "center" }}>{t("Prices and limits are placeholders until launch.", "الأسعار والحدود مبدئية لين الإطلاق.")}</p>
      {process.env.NODE_ENV !== "production" && (
        <form action={devSetPlanAction} className="dev" style={{ display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="plan" value={plus ? "free" : "plus"} />
          {t("Development only: switch plan without paying.", "للتطوير فقط: غيّر الباقة بدون دفع.")}
          <button className="btn-text">{plus ? t("Switch back to Free", "ارجع للمجانية") : t("Switch to Plus for testing", "حوّل لبلس للتجربة")}</button>
        </form>
      )}
    </>
  );
}

export default async function PlansPage({ params, searchParams }: PageProps<"/[lang]/plans">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ar";
  return (
    <Page lang={lang} title={lang === "ar" ? "الباقات" : "Plans"}>
      <Plans lang={lang} searchParams={searchParams} />
    </Page>
  );
}
