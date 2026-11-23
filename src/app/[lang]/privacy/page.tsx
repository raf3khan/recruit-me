import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { isLang } from "@/lib/i18n";
import { TITLES } from "@/lib/legal/content";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  return { title: TITLES.privacy[isLang(lang) ? lang : "ar"] };
}

export default async function Page({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  return <LegalPage lang={isLang(lang) ? lang : "ar"} doc="privacy" />;
}
