import type { Application, Job } from "@/lib/db/schema";
import type { T } from "@/lib/i18n";

const COLORS = [
  ["#34d399", "#047857"],
  ["#fbbf24", "#c2410c"],
  ["#c084fc", "#6d28d9"],
  ["#60a5fa", "#1d4ed8"],
  ["#fb7185", "#be123c"],
  ["#a3e635", "#4d7c0f"],
];

/** A coloured company initial, stable per company name. */
export function Mark({ name, size }: { name: string; size?: string }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = COLORS[h % COLORS.length];
  return (
    <span className="mark" aria-hidden="true" style={{ background: `linear-gradient(140deg, ${a}, ${b})`, ...(size ? { width: size, height: size } : {}) }}>
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

export function FitTag({ fit, t }: { fit: number; t: T }) {
  const label = fit >= 2 ? t("Great fit", "مناسبة جداً") : fit === 1 ? t("Good fit", "مناسبة") : t("Partial fit", "مناسبة جزئياً");
  return <span className={`tag ${fit >= 2 ? "fit" : fit === 0 ? "warn" : ""}`}>{label}</span>;
}

export function statusLabel(status: Application["status"], t: T) {
  return {
    sent: t("Sent", "انرسل"),
    reply: t("Replied", "وصل رد"),
    interview: t("Interview", "مقابلة"),
    offer: t("Offer", "عرض وظيفي"),
    closed: t("Closed", "انتهى"),
  }[status];
}

export function StatusPill({ status, t }: { status: Application["status"]; t: T }) {
  const cls = status === "offer" ? "reply" : status;
  return <span className={`status-pill st-${cls}`}>{statusLabel(status, t)}</span>;
}

export const companyOf = (job: Job, t: T) => job.company ?? t("Company not stated", "الشركة غير مذكورة");
