import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { Icon } from "./icon";
import { LangSwitch } from "./lang-switch";

export function Logo({ lang, name = true }: { lang: Lang; name?: boolean }) {
  return (
    <span className="logo">
      <i aria-hidden="true">{lang === "ar" ? "و" : "W"}</i>
      {name && (lang === "ar" ? "وظيفة" : "Wadhifa")}
    </span>
  );
}

/** Top bar and content column for a page inside the app shell. The body streams in behind Suspense. */
export function Page({ lang, title, back, children }: { lang: Lang; title: string; back?: string; children: ReactNode }) {
  return (
    <>
      <header className="top">
        {back ? (
          <Link className="icon-btn" href={back} aria-label={lang === "ar" ? "رجوع" : "Back"}>
            <Icon name="back" />
          </Link>
        ) : (
          <Logo lang={lang} name={false} />
        )}
        <h1>{title}</h1>
        <LangSwitch lang={lang} />
      </header>
      <main className="content" id="main">
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </main>
    </>
  );
}

export function Loading() {
  return (
    <div style={{ display: "grid", gap: "1rem" }} aria-busy="true">
      <div className="skeleton" />
      <div className="skeleton" style={{ height: "12rem" }} />
    </div>
  );
}
