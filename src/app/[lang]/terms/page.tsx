import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { isLang } from "@/lib/i18n";
import { TITLES } from "@/lib/legal/content";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const { lang } = await params;
  return { title: TITLES.terms[isLang(lang) ? lang : "ar"] };
}

export default async function Page({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  return <LegalPage lang={isLang(lang) ? lang : "ar"} doc="terms" />;
}
