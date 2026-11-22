"use client";

import Link from "next/link";
import Script from "next/script";
import { useState } from "react";

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
 * Loads Paddle.js. Given ?_ptxn= in the URL, Paddle.js opens that checkout itself.
 * Overlay mode is full screen on phones and supports Apple Pay in Safari.
 */
export function PaddleCheckout({ clientToken, environment }: { clientToken: string; environment: string }) {
  const [state, setState] = useState<"loading" | "closed" | "done" | "error">("loading");

  function init() {
    const paddle = window.Paddle;
    if (!paddle || !clientToken) {
      setState("error");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (environment === "sandbox") paddle.Environment.set("sandbox");
    paddle.Initialize({
      token: clientToken,
      checkout: {
        settings: {
          displayMode: "overlay",
          locale: params.get("lang") === "en" ? "en" : "ar",
          theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
          successUrl: `${window.location.origin}/?billing=success`,
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
        <p className="mt-6">
          سكّرت صفحة الدفع.{" "}
          <Link className="font-semibold text-accent underline" href="/">
            ارجع للصفحة الرئيسية
          </Link>
        </p>
      )}
      {state === "done" && <p className="mt-6 font-semibold text-accent">تم الاشتراك. نرجّعك الحين...</p>}
      {state === "error" && (
        <p role="alert" className="mt-6 rounded-xl bg-warn-soft px-4 py-3 text-warn">
          ما قدرنا نفتح صفحة الدفع. جرّب مرة ثانية بعد شوي.
        </p>
      )}
    </>
  );
}
