"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

function SwitchLink({ lang, path }: { lang: "ar" | "en"; path: string }) {
  const other = lang === "ar" ? "en" : "ar";
  return (
    <Link className="lang-btn" href={path.replace(/^\/(ar|en)(?=\/|$)/, `/${other}`)} hrefLang={other} lang={other}>
      {other === "en" ? "English" : "عربي"}
    </Link>
  );
}

function Live({ lang }: { lang: "ar" | "en" }) {
  return <SwitchLink lang={lang} path={usePathname() ?? `/${lang}`} />;
}

/** Links to the same page in the other language. */
export function LangSwitch({ lang }: { lang: "ar" | "en" }) {
  return (
    <Suspense fallback={<SwitchLink lang={lang} path={`/${lang}`} />}>
      <Live lang={lang} />
    </Suspense>
  );
}
