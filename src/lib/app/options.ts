import type { Lang } from "@/lib/i18n";

/** Choices for job preferences. Stored by their English value; labels per language. */
export const ROLES = ["Data analyst", "BI", "Business analyst", "Operations", "Software", "Marketing", "Finance", "HR"];
export const CITIES = ["Riyadh", "Jeddah", "Dammam", "Dubai", "Abu Dhabi", "Doha", "Kuwait City", "Manama", "Muscat", "Remote"];
export const SECTORS = ["Fintech", "Health", "Retail", "Government", "Energy", "Tech", "Any"];

const AR: Record<string, string> = {
  Riyadh: "الرياض",
  Jeddah: "جدة",
  Dammam: "الدمام",
  Dubai: "دبي",
  "Abu Dhabi": "أبوظبي",
  Doha: "الدوحة",
  "Kuwait City": "الكويت",
  Manama: "المنامة",
  Muscat: "مسقط",
  Remote: "عن بُعد",
  Fintech: "فنتك",
  Health: "صحة",
  Retail: "تجزئة",
  Government: "حكومي",
  Energy: "طاقة",
  Tech: "تقنية",
  Any: "أي قطاع",
  Marketing: "تسويق",
  Finance: "مالية",
  HR: "موارد بشرية",
  Software: "برمجيات",
  Operations: "عمليات",
};

/** Role titles stay in English (they match English job ads); cities and sectors are translated. */
export const optionLabel = (lang: Lang, value: string) => (lang === "ar" ? (AR[value] ?? value) : value);
