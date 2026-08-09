import * as React from "react";
import type { TranslationDashboardService } from "./TranslationDashboardService";
import type { CollectionCoverage, TranslationAuditRow, TranslationSourceType } from "../types";

/**
 * Tina's own `createScreen`/`ScreenPlugin` aren't part of the `tinacms`
 * package's public export map (verified against its package.json —  only
 * "." and a handful of other subpaths are exported; `tinacms/dist/toolkit/*`
 * resolves on disk but isn't a supported import path) even though
 * `MediaUsageDashboardScreenPlugin` uses exactly this shape internally
 * (`node_modules/tinacms/dist/index.js`'s own `createScreen`: `{ __type:
 * "screen", layout: "popup", ...options, Component: (screenProps) =>
 * Component(screenProps) }`). So this constructs the same plugin object
 * shape directly rather than importing the (inaccessible) helper —
 * `cms.plugins.add()` only cares that the object structurally matches,
 * not where it came from. Same reasoning as
 * cms/seo/dashboard/createSeoDashboardScreen.tsx.
 */
type ScreenPlugin = {
  __type: "screen";
  name: string;
  Component: (props: { close(): void }) => React.ReactElement;
  Icon: React.ComponentType;
  layout: "fullscreen" | "popup";
  navCategory?: "Account" | "Site" | "Dashboard";
};

function TranslateIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 5h7M7.5 4v2M4 8c1 2.5 3 4 6 5M9.5 8c-.5 2-2 4.5-5 6M13 20l4-9 4 9M14.5 17h5" />
    </svg>
  );
}

function TranslationDashboard<TCollectionName extends string, TLocale extends string>({
  dashboard,
}: {
  dashboard: TranslationDashboardService<TCollectionName, TLocale>;
}) {
  const [coverage, setCoverage] = React.useState<CollectionCoverage<TCollectionName, TLocale>[]>();
  const [audit, setAudit] = React.useState<TranslationAuditRow<TCollectionName, TLocale>[]>();

  React.useEffect(() => {
    dashboard.getStats().then(setCoverage);
    dashboard.getAudit().then(setAudit);
  }, [dashboard]);

  if (!coverage || !audit) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  const locales = (coverage.length > 0 ? Object.keys(coverage[0].countsByLocale) : []) as TLocale[];
  const defaultLocale = locales[0];

  // Per-locale aggregate across every row (content collection, "pages", and
  // taxonomy) — sum-then-divide over raw totals, not an average of
  // already-rounded per-row percentages, same reasoning as the SEO
  // dashboard's overallByLocale.
  const overallByLocale = Object.fromEntries(
    locales.map((locale) => {
      const translated = coverage.reduce((sum, row) => sum + row.translatedByLocale[locale], 0);
      const total = coverage.reduce((sum, row) => sum + row.countsByLocale[locale], 0);
      return [locale, total === 0 ? 100 : Math.round((translated / total) * 100)];
    })
  ) as Record<TLocale, number>;

  // Single site-wide number — every non-default locale pooled together
  // (the default locale is always 100% translated into itself, so including
  // it would just dilute the number toward 100 without meaning anything).
  const { overallTranslated, overallTotal } = coverage.reduce(
    (sums, row) => {
      for (const locale of locales) {
        if (locale === defaultLocale) continue;
        sums.overallTranslated += row.translatedByLocale[locale];
        sums.overallTotal += row.countsByLocale[locale];
      }
      return sums;
    },
    { overallTranslated: 0, overallTotal: 0 }
  );
  const overallPercent = overallTotal === 0 ? 100 : Math.round((overallTranslated / overallTotal) * 100);
  const missingCount = audit.length;

  // Same three-tier read as the SEO dashboard's score card — red for real
  // gaps, amber for mostly-there, green for solid — so the two dashboards
  // feel like one system rather than two different scales.
  const coverageColor = (percent: number) => (percent >= 90 ? "#1a7f37" : percent >= 60 ? "#b54708" : "#b42318");
  const coverageCardStyle = (percent: number) =>
    percent >= 90
      ? { backgroundColor: "#f0faf3", borderColor: "#b7e4c7" }
      : percent >= 60
        ? { backgroundColor: "#fffaf0", borderColor: "#fadfa0" }
        : { backgroundColor: "#fdf3f2", borderColor: "#f3c6c1" };

  const typeBadge = (type: TranslationSourceType) => (
    <span
      style={{
        display: "inline-block",
        marginLeft: 8,
        padding: "1px 6px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        color: type === "taxonomy" ? "#7c3aed" : "#475569",
        backgroundColor: type === "taxonomy" ? "#f3ecfd" : "#f1f5f9",
      }}
    >
      {type === "taxonomy" ? "Taxonomy" : "Content"}
    </span>
  );

  const typeLabel = (type: TranslationSourceType) => (type === "taxonomy" ? "Taxonomy" : "Content");

  const panelStyle: React.CSSProperties = {
    border: "1px solid #e2e2e2",
    borderRadius: 10,
    padding: "16px 20px",
  };

  // Same URL shape Tina's own "Edit in CMS" links use (`getDocumentEditUrl`
  // in tinacms/dist/index.js): `~/<breadcrumbs>`, where breadcrumbs for
  // every locale-directory collection here is `<locale>/<filename>` — see
  // createSeoDashboardScreen.tsx's editHref for the fuller citation.
  // Points at the *source* document (the one that exists), since a missing
  // translation has no document of its own to link to yet.
  const editHref = (row: { collectionName: TCollectionName; locale: TLocale; filename: string }) =>
    `#/collections/edit/${row.collectionName}/~/${row.locale}/${row.filename}`;

  // Locale/type subtitle + label > filename breadcrumb, same layout as the
  // SEO dashboard's itemCell — reads like a file path instead of repeating
  // "Content"/"Taxonomy" down a separate column.
  const itemCell = (row: TranslationAuditRow<TCollectionName, TLocale>) => (
    <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", verticalAlign: "top" }}>
      <div style={{ fontSize: 11, color: "#888" }}>
        {row.sourceLocale} · {typeLabel(row.type)}
      </div>
      <div style={{ marginTop: 2 }}>
        <span style={{ fontWeight: 500 }}>{row.label}</span>
        <span style={{ color: "#94a3b8", margin: "0 4px" }}>›</span>
        <a
          href={editHref({ collectionName: row.collectionName, locale: row.sourceLocale, filename: row.filename })}
          target="_blank"
          rel="noopener"
          style={{ color: "#2563eb", textDecoration: "none" }}
        >
          {row.filename} ↗
        </a>
      </div>
    </td>
  );

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Translation coverage</h1>
      <div style={{ display: "flex", alignItems: "stretch", gap: 16, marginTop: 8, marginBottom: 24 }}>
        <div
          style={{
            ...panelStyle,
            ...coverageCardStyle(overallPercent),
            flex: "0 0 220px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: coverageColor(overallPercent) }}>
            {overallPercent}%
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#666", marginTop: 6 }}>translated overall</div>
          <div
            style={{
              fontSize: 12,
              color: "#666",
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid rgba(0,0,0,0.08)",
              width: "100%",
            }}
          >
            {missingCount === 0
              ? "Every document is translated into every locale"
              : `${missingCount} document${missingCount === 1 ? "" : "s"} missing a translation`}
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#344054", marginBottom: 8 }}>How this is measured</div>
          <p style={{ fontSize: 13, color: "#666", margin: 0, maxWidth: 560 }}>
            A locale&rsquo;s coverage % is how many of the default locale&rsquo;s (
            <strong>{defaultLocale}</strong>) documents have a same-filename counterpart in that locale — pairing
            works by filename across this whole app (see CLAUDE.md&rsquo;s &ldquo;Cross-locale linking&rdquo;
            section), not by slug. The overall number above pools every non-default locale together.
          </p>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2" }}>Collection</th>
            {locales.map((locale) => (
              <th key={locale} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2" }}>
                <span>{locale}</span>{" "}
                <span style={{ color: coverageColor(overallByLocale[locale]), fontWeight: 600 }}>
                  {overallByLocale[locale]}%
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {coverage.map((row) => (
            <tr key={row.collectionName}>
              <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", fontWeight: 500 }}>
                {row.label}
                {typeBadge(row.type)}
              </td>
              {locales.map((locale) => {
                const percent = row.coveragePercentByLocale[locale];
                return (
                  <td
                    key={locale}
                    style={{
                      padding: 8,
                      borderBottom: "1px solid #f0f0f0",
                      color: coverageColor(percent),
                      fontWeight: percent < 100 ? 600 : 400,
                    }}
                  >
                    {row.translatedByLocale[locale]}/{row.countsByLocale[locale]} ({percent}%)
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Documents missing a translation</h2>
      {audit.length === 0 ? (
        <p style={{ color: "#666" }}>Nothing missing — every document is translated into every locale.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2" }}>Item</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2" }}>Missing in</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((row, i) => (
                <tr key={i}>
                  {itemCell(row)}
                  <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", fontWeight: 600, color: "#b42318" }}>
                    {row.missingLocale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Tina admin Screen plugin — the one deliberate exception to "cms/ never
 * exports JSX for the public site": this renders inside Tina's own admin
 * chrome, not the client's branded site, same as Tina's own built-in
 * MediaUsageDashboardScreenPlugin. */
export function createTranslationDashboardScreen<TCollectionName extends string, TLocale extends string>(
  dashboard: TranslationDashboardService<TCollectionName, TLocale>
): ScreenPlugin {
  return {
    __type: "screen",
    name: "Translation Coverage",
    Component: () => <TranslationDashboard dashboard={dashboard} />,
    Icon: TranslateIcon,
    layout: "fullscreen",
    navCategory: "Dashboard",
  };
}
