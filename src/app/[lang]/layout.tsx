import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { isLang, LANGS } from "@/lib/i18n";
import { isHostedTest } from "@/lib/mode";
import "../globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return lang === "en"
    ? { title: "Wadhifa", description: "A resume and cover letter tailored to every job. You review, you send." }
    : { title: "«وظيفة»", description: "سيرة ذاتية وخطاب تقديم مفصّلين على كل وظيفة، وأنت اللي تقرر ترسل." };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className={plexArabic.variable}>
      <body>
        {isHostedTest() && (
          <p className="test-banner" role="status">
            {lang === "ar"
              ? "نسخة تجريبية: رمز الدخول يظهر على الشاشة، والدفع مو حقيقي."
              : "Test version: sign-in codes show on screen and payments are simulated."}
          </p>
        )}
        {children}
      </body>
    </html>
  );
}
