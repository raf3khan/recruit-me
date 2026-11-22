"use client";

import { useCallback, useEffect, useState } from "react";

interface PlanView {
  id: string;
  interval: "month" | "year";
  name: { ar: string; en: string };
  displayPrice: string | null;
}

interface BillingState {
  plans: PlanView[];
  tier: "free" | "paid";
  packsUsed: number;
  packsLimit: number | null;
}

/** Reads plans and allowance; `refresh` is called after each tailored pack. */
export function useBilling() {
  const [state, setState] = useState<BillingState | null>(null);
  const refresh = useCallback(async () => {
    const res = await fetch("/api/billing/plans");
    if (res.ok) setState(await res.json());
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the server
    void refresh();
  }, [refresh]);
  return { billing: state, refreshBilling: refresh };
}

/** One line under the tailor button: how many free packs are left this month. */
export function Allowance({ billing }: { billing: BillingState | null }) {
  if (!billing || billing.packsLimit === null) return null;
  const left = Math.max(0, billing.packsLimit - billing.packsUsed);
  return (
    <p className="mt-2 text-sm text-muted">
      باقي لك {left} من {billing.packsLimit} باقات مجانية هذا الشهر.
    </p>
  );
}

/**
 * The upgrade offer. Mobile first: plans stack in one column with full-width,
 * 48px-tall buttons, and checkout opens as a full page rather than a popup.
 */
export function UpgradeOffer({ billing }: { billing: BillingState | null }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(planId: string) {
    setBusy(planId);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, locale: document.documentElement.lang === "en" ? "en" : "ar" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "ما قدرنا نفتح صفحة الدفع. جرّب بعد شوي.");
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  const plans = billing?.plans ?? [];
  return (
    <section className="rounded-2xl border-2 border-accent bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold">خلصت باقاتك المجانية لهذا الشهر</h2>
      <p className="mt-2 text-muted">
        اشترك وجهّز سيرتك وخطابك لكل وظيفة بدون حد، بكتابة أدق. تقدر تلغي متى ما بغيت.
      </p>
      {plans.length === 0 ? (
        <p className="mt-4 text-sm text-muted">الاشتراك بيكون متاح قريب.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => subscribe(plan.id)}
              disabled={busy !== null}
              className="flex min-h-12 w-full flex-col items-start justify-center rounded-xl bg-accent px-5 py-3 text-start font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:text-black"
            >
              <span>{busy === plan.id ? "نفتح صفحة الدفع..." : plan.name.ar}</span>
              {plan.displayPrice && <span className="text-sm font-normal opacity-90">{plan.displayPrice}</span>}
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-sm text-muted">الدفع آمن عن طريق Paddle، بالبطاقة أو Apple Pay أو Google Pay.</p>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-warn">
          {error}
        </p>
      )}
    </section>
  );
}

/** Shown after Paddle sends the candidate back with ?billing=success. Read on the client so the page stays static. */
export function SubscribedBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once after load
    setShow(new URLSearchParams(window.location.search).get("billing") === "success");
  }, []);
  if (!show) return null;
  return (
    <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 font-semibold text-accent">
      تم اشتراكك، شكراً لك! الحين تقدر تجهّز ملفاتك لكل وظيفة بدون حد.
    </p>
  );
}
