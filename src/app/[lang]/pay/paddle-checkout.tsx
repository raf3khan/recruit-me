"use client";

import Link from "next/link";
import Script from "next/script";
import { useState } from "react";
import type { Lang } from "@/lib/i18n";

declare global {
  interface Window {
    Paddle?: {
      Environment: { set(env: string): void };
      Initialize(options: {
        token: string;
        checkout?: { settings?: Record<string, unknown> };
        eventCallback?: (event: { name?: string }) => void;
      }): void;
    };
  }
}

/**
 * Loads Paddle.js. With ?_ptxn= in the URL, Paddle.js opens that checkout itself.
 * Overlay mode fills the screen on phones and offers Apple Pay in Safari.
 */
export function PaddleCheckout({ lang, clientToken, environment }: { lang: Lang; clientToken: string; environment: string }) {
  const [state, setState] = useState<"loading" | "closed" | "done" | "error">("loading");
  const ar = lang === "ar";

  function init() {
    const paddle = window.Paddle;
    if (!paddle || !clientToken) {
      setState("error");
      return;
    }
    if (environment === "sandbox") paddle.Environment.set("sandbox");
    paddle.Initialize({
      token: clientToken,
      checkout: {
        settings: {
          displayMode: "overlay",
          locale: lang,
          theme: "light",
          successUrl: `${window.location.origin}/${lang}/plans?billing=success`,
        },
      },
      eventCallback: (event) => {
        if (event.name === "checkout.completed") setState("done");
        if (event.name === "checkout.closed") setState((s) => (s === "done" ? s : "closed"));
      },
    });
  }

  return (
    <>
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" onLoad={init} onError={() => setState("error")} />
      {state === "closed" && (
        <p>
          {ar ? "سكّرت صفحة الدفع. " : "You closed the payment page. "}
          <Link className="btn-text" href={`/${lang}/plans`}>
            {ar ? "ارجع للباقات" : "Back to plans"}
          </Link>
        </p>
      )}
      {state === "done" && <p role="status">{ar ? "تم الدفع، نرجّعك الحين..." : "Payment done, taking you back..."}</p>}
      {state === "error" && (
        <p className="error" role="alert">
          {ar ? "ما قدرنا نفتح صفحة الدفع. جرّب مرة ثانية بعد شوي." : "We couldn't open the payment page. Try again shortly."}
        </p>
      )}
    </>
  );
}
