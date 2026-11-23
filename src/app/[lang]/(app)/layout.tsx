import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/page";
import { SideNav, TabBar, type NavItem } from "@/components/nav";
import { currentUser } from "@/lib/auth/current";
import { usageFor } from "@/lib/app/usage";
import { getDb } from "@/lib/db";
import { isLang, packsCount, translator, type Lang } from "@/lib/i18n";

function navItems(lang: Lang): NavItem[] {
  const t = translator(lang);
  return [
    { href: `/${lang}/home`, icon: "chat", label: t("Assistant", "المساعد"), tab: true },
    { href: `/${lang}/jobs`, icon: "jobs", label: t("Jobs", "الوظائف"), tab: true },
    { href: `/${lang}/applications`, icon: "apps", label: t("Applications", "تقديماتي"), tab: true },
    { href: `/${lang}/profile`, icon: "user", label: t("Profile", "ملفي"), tab: true },
    { href: `/${lang}/plans`, icon: "star", label: t("Plans", "الباقات"), tab: false },
    { href: `/${lang}/account`, icon: "gear", label: t("Account", "الحساب"), tab: true },
  ];
}

/** Plan and allowance in the sidebar. Reads the session, so it streams in. */
async function MeterCard({ lang }: { lang: Lang }) {
  const user = await currentUser();
  if (!user) return null;
  const t = translator(lang, user.addressForm);
  const usage = await usageFor(await getDb(), user);
  if (usage.limit === null)
    return (
      <div className="meter-card">
        <b>{t("Plus plan", "باقة بلس")}</b>
        <span>{t("Unlimited packs", "تجهيز بلا حدود")}</span>
      </div>
    );
  return (
    <div className="meter-card">
      <b>{t("Free plan", "الباقة المجانية")}</b>
      <span>
        {t(
          `${usage.used} of ${packsCount("en", usage.limit)} used this month`,
          `استخدمت ${usage.used} من ${packsCount("ar", usage.limit)} هالشهر`,
          `استخدمتِ ${usage.used} من ${packsCount("ar", usage.limit)} هالشهر`,
        )}
      </span>
      <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={usage.limit} aria-valuenow={usage.used}>
        <span style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} />
      </div>
      <Link className="btn-text" href={`/${lang}/plans`} style={{ justifySelf: "start", padding: 0 }}>
        {t("Go Plus", "ترقية لبلس")}
      </Link>
    </div>
  );
}

export default async function AppLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "ar";
  const items = navItems(l);
  return (
    <div className="shell">
      <nav className="side" aria-label={l === "ar" ? "القائمة" : "Menu"}>
        <Logo lang={l} />
        <SideNav items={items} />
        <Suspense fallback={null}>
          <MeterCard lang={l} />
        </Suspense>
      </nav>
      <div className="main">{children}</div>
      <TabBar items={items} label={l === "ar" ? "التنقل" : "Navigation"} />
    </div>
  );
}
