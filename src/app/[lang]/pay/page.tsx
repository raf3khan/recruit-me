import { Logo } from "@/components/page";
import { isLang } from "@/lib/i18n";
import { PaddleCheckout } from "./paddle-checkout";

/**
 * Paddle's default payment link points here (https://<domain>/ar/pay). Paddle
 * sends the user to /ar/pay?_ptxn=<transaction id>, and Paddle.js opens that checkout.
 */
export default async function PayPage({ params }: PageProps<"/[lang]/pay">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ar";
  return (
    <main className="content" id="main" style={{ display: "grid", gap: "1rem", paddingBlock: "2.5rem" }}>
      <Logo lang={lang} />
      <h1>{lang === "ar" ? "نجهّز صفحة الدفع" : "Opening the payment page"}</h1>
      <p className="muted">
        {lang === "ar" ? "ثواني وتفتح لك صفحة الدفع الآمنة." : "The secure payment page opens in a few seconds."}
      </p>
      <PaddleCheckout
        lang={lang}
        clientToken={process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? ""}
        environment={process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox"}
      />
    </main>
  );
}
