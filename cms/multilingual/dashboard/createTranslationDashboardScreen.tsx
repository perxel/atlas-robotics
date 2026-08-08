import * as React from "react";
import type { TranslationDashboardService } from "./TranslationDashboardService";

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
 * not where it came from.
 */
type ScreenPlugin = {
  __type: "screen";
  name: string;
  Component: (props: { close(): void }) => React.ReactElement;
  Icon: React.ComponentType;
  layout: "fullscreen" | "popup";
  navCategory?: "Account" | "Site" | "Dashboard";
};

/** No external icon dependency — a plain inline glyph is all a screen plugin's `Icon` needs. */
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
  const [stats, setStats] =
    React.useState<Awaited<ReturnType<TranslationDashboardService<TCollectionName, TLocale>["getStats"]>>>();

  React.useEffect(() => {
    dashboard.getStats().then(setStats);
  }, [dashboard]);

  if (!stats) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  const locales = (stats.length > 0 ? Object.keys(stats[0].countsByLocale) : []) as TLocale[];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Translation coverage</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
          {stats.map((row) => (
            <tr key={row.collectionName}>
              <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", fontWeight: 500 }}>
                {row.collectionName}
              </td>
              {locales.map((locale) => (
                <td key={locale} style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                  {row.countsByLocale[locale]} ({row.coveragePercentByLocale[locale]}%)
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
