import { CITIES, ROLES, SECTORS, optionLabel } from "@/lib/app/options";
import type { Preferences } from "@/lib/db/schema";
import type { Lang, T } from "@/lib/i18n";

/** Role, city, sector and work-type choices; used in onboarding and on the profile page. */
export function PrefsFields({ lang, t, prefs }: { lang: Lang; t: T; prefs: Preferences | null }) {
  const p: Preferences = prefs ?? { roles: [], cities: [], sectors: [], workType: "full" };
  const group = (name: "roles" | "cities" | "sectors", values: string[], label: string) => (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 700, marginBottom: ".35rem" }}>{label}</legend>
      <div className="chips">
        {values.map((v) => (
          <label key={v} className="chip">
            <input type="checkbox" name={name} value={v} defaultChecked={p[name].includes(v)} />
            <span className={name === "roles" ? "en" : undefined}>{optionLabel(lang, v)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
  return (
    <div style={{ display: "grid", gap: ".9rem" }}>
      {group("roles", ROLES, t("Role", "المسمى"))}
      {group("cities", CITIES, t("City", "المدينة"))}
      {group("sectors", SECTORS, t("Sector", "القطاع"))}
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 700, marginBottom: ".35rem" }}>{t("Work type", "نوع الدوام")}</legend>
        <div className="seg">
          {([
            ["full", t("Full time", "دوام كامل")],
            ["grad", t("Graduate program", "برنامج خريجين")],
            ["intern", t("Internship", "تدريب")],
          ] as const).map(([v, l]) => (
            <label key={v}>
              <input type="radio" name="workType" value={v} defaultChecked={p.workType === v} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
