import Link from "next/link";
import { LangSwitch } from "@/components/lang-switch";
import { Logo } from "@/components/page";
import type { Lang } from "@/lib/i18n";
import { legalDoc, TITLES, type Doc } from "@/lib/legal/content";
import { LEGAL_UPDATED } from "@/lib/legal/operator";

const DOCS: Doc[] = ["terms", "privacy", "refunds"];

/** Links to the three policies. Used on sign-up and the legal pages; Paddle's review needs them reachable from the site. */
export function LegalLinks({ lang }: { lang: Lang }) {
  return (
    <nav className="small muted" aria-label={lang === "ar" ? "السياسات" : "Policies"} style={{ display: "flex", gap: ".9rem", flexWrap: "wrap", justifyContent: "center" }}>
      {DOCS.map((d) => (
        <Link key={d} href={`/${lang}/${d}`} className="muted">
          {TITLES[d][lang]}
        </Link>
      ))}
    </nav>
  );
}

/** A public policy page: no sign-in needed. */
export function LegalPage({ lang, doc }: { lang: Lang; doc: Doc }) {
  return (
    <>
      <header className="top">
        <Link href={`/${lang}`} aria-label={lang === "ar" ? "الرئيسية" : "Home"}>
          <Logo lang={lang} name={false} />
        </Link>
        <h1>{TITLES[doc][lang]}</h1>
        <LangSwitch lang={lang} />
      </header>
      <main className="content" id="main">
        <p className="small muted">
          {lang === "ar" ? `آخر تحديث: ${LEGAL_UPDATED.ar}` : `Last updated: ${LEGAL_UPDATED.en}`}
        </p>
        {legalDoc(doc).map((section) => (
          <section key={section.heading.en} className="card" style={{ display: "grid", gap: ".6rem" }}>
            <h2>{section.heading[lang]}</h2>
            {section.body.map((p) => (
              <p key={p.en} style={{ margin: 0 }}>
                {p[lang]}
              </p>
            ))}
          </section>
        ))}
        <LegalLinks lang={lang} />
      </main>
    </>
  );
}
