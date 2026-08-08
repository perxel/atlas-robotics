import * as React from "react";
import type { SeoDashboardService } from "./SeoDashboardService";
import type { SeoAuditRow, SeoCoverage } from "../types";

/** Same reasoning as cms/multilingual/dashboard/createTranslationDashboardScreen.tsx:
 * Tina's `createScreen`/`ScreenPlugin` aren't part of the `tinacms` package's
 * public export map, so this constructs the same plugin object shape
 * directly instead of importing the inaccessible internal helper. */
type ScreenPlugin = {
  __type: "screen";
  name: string;
  Component: (props: { close(): void }) => React.ReactElement;
  Icon: React.ComponentType;
  layout: "fullscreen" | "popup";
  navCategory?: "Account" | "Site" | "Dashboard";
};

function SeoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.35-4.35" />
    </svg>
  );
}

function SeoDashboard<TCollectionName extends string, TLocale extends string>({
  dashboard,
}: {
  dashboard: SeoDashboardService<TCollectionName, TLocale>;
}) {
  const [coverage, setCoverage] = React.useState<SeoCoverage<TCollectionName, TLocale>[]>();
  const [audit, setAudit] = React.useState<SeoAuditRow<TCollectionName, TLocale>[]>();

  React.useEffect(() => {
    dashboard.getCoverage().then(setCoverage);
    dashboard.getAudit({ onlyMissing: true }).then(setAudit);
  }, [dashboard]);

  if (!coverage || !audit) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  const locales = (coverage.length > 0 ? Object.keys(coverage[0].countsByLocale) : []) as TLocale[];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>SEO coverage</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2" }}>Collection</th>
            {locales.map((locale) => (
              <th key={locale} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2" }}>
                {locale}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {coverage.map((row) => (
            <tr key={row.collectionName}>
              <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", fontWeight: 500 }}>
                {row.collectionName}
              </td>
              {locales.map((locale) => (
                <td key={locale} style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                  {row.completeByLocale[locale]}/{row.countsByLocale[locale]} ({row.completionPercentByLocale[locale]}%)
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Documents missing required SEO fields</h2>
      {audit.length === 0 ? (
        <p style={{ color: "#666" }}>Nothing missing — every document has its required SEO fields set.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2" }}>Collection</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2" }}>Locale</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2" }}>Slug</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2" }}>Missing</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((row, i) => (
              <tr key={i}>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{row.collectionName}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{row.locale}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{row.slug}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{row.missingFields.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Tina admin Screen plugin — the one deliberate exception to "cms/ never
 * exports JSX for the public site." Unlike the Translation Dashboard, not
 * gated behind any enable/disable check — SEO completeness matters even on
 * a single-locale site. */
export function createSeoDashboardScreen<TCollectionName extends string, TLocale extends string>(
  dashboard: SeoDashboardService<TCollectionName, TLocale>
): ScreenPlugin {
  return {
    __type: "screen",
    name: "SEO Coverage",
    Component: () => <SeoDashboard dashboard={dashboard} />,
    Icon: SeoIcon,
    layout: "fullscreen",
    navCategory: "Dashboard",
  };
}
