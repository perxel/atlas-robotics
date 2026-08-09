import * as React from "react";
import type {SeoDashboardService} from "./SeoDashboardService";
import type {SeoAuditRow, SeoCoverage, SeoFieldScore, SeoScoredField} from "../types";

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

/** The rubric — displayed as-is in the dashboard's legend panel, and the
 * literal weights/ranges `SeoDashboardService`'s `#scoreEntry` implements.
 * Keeping this list next to the UI that renders it (rather than importing a
 * constant from the service) is deliberate: this is display copy, not
 * scoring logic — the service is the source of truth for the actual points. */
const RUBRIC: Array<{ field: SeoScoredField; label: string; points: number; rule: string }> = [
    {field: "metaTitle", label: "Title", points: 30, rule: "30–60 characters"},
    {field: "metaDescription", label: "Description", points: 30, rule: "70–160 characters"},
    {field: "ogImage", label: "OG image", points: 25, rule: "present"},
    {field: "ogImageAlt", label: "OG image alt", points: 15, rule: "present when an image is set"},
];

function SeoIcon() {
    return (
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7"/>
            <path d="M20 20l-4.35-4.35"/>
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
        dashboard.getAudit({onlyImperfect: true}).then(setAudit);
    }, [dashboard]);

    if (!coverage || !audit) {
        return <div style={{padding: 24}}>Loading…</div>;
    }

    const locales = (coverage.length > 0 ? Object.keys(coverage[0].countsByLocale) : []) as TLocale[];

    // Per-locale aggregate across every row (content collection, "pages", and
    // taxonomy) — sum-then-divide over raw totals, not an average of
    // already-rounded per-row percentages, so a large collection's gaps
    // aren't diluted (or a small one's rounding error compounded) by the
    // aggregation step.
    const overallByLocale = Object.fromEntries(
        locales.map((locale) => {
            const total = coverage.reduce((sum, row) => sum + row.totalScoreByLocale[locale], 0);
            const count = coverage.reduce((sum, row) => sum + row.countsByLocale[locale], 0);
            return [locale, count === 0 ? 100 : Math.round(total / count)];
        })
    ) as Record<TLocale, number>;

    // Single site-wide number — every locale's docs pooled together, same
    // sum-then-divide reasoning as overallByLocale, just not split by
    // column. This is the headline "how are we doing overall" figure.
    const {overallTotal, overallCount} = coverage.reduce(
        (sums, row) => {
            for (const locale of locales) {
                sums.overallTotal += row.totalScoreByLocale[locale];
                sums.overallCount += row.countsByLocale[locale];
            }
            return sums;
        },
        {overallTotal: 0, overallCount: 0}
    );
    const overallScore = overallCount === 0 ? 100 : Math.round(overallTotal / overallCount);
    const imperfectDocsCount = audit.length;

    // Three tiers, not the old all-or-nothing "100 or red" — a graded score
    // deserves a graded read: red for real gaps, amber for "works but could
    // be tightened," green for solid.
    const scoreColor = (score: number) => (score >= 90 ? "#1a7f37" : score >= 60 ? "#b54708" : "#b42318");
    const scoreCardStyle = (score: number) =>
        score >= 90
            ? {backgroundColor: "#f0faf3", borderColor: "#b7e4c7"}
            : score >= 60
                ? {backgroundColor: "#fffaf0", borderColor: "#fadfa0"}
                : {backgroundColor: "#fdf3f2", borderColor: "#f3c6c1"};

    const typeBadge = (type: "content" | "taxonomy") => (
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

    const panelStyle: React.CSSProperties = {
        border: "1px solid #e2e2e2",
        borderRadius: 10,
        padding: "16px 20px",
    };

    // Same URL shape Tina's own "Edit in CMS" links use
    // (`getDocumentEditUrl` in tinacms/dist/index.js): `~/<breadcrumbs>`,
    // where breadcrumbs for every locale-directory collection here is just
    // `<locale>/<filename>` (confirmed against CollectionService/
    // PagesService/TaxonomyService's getSeoIndex — all three derive
    // `filename`/`locale` from `_sys.relativePath`/`_sys.breadcrumbs[0]`
    // the same way). Hash-relative, not a full `/admin/index.html#...` URL,
    // because this screen is already mounted inside that same admin SPA —
    // Tina's router picks up the hash change without a full page reload.
    const editHref = (row: {collectionName: TCollectionName; locale: TLocale; filename: string}) =>
        `#/collections/edit/${row.collectionName}/~/${row.locale}/${row.filename}`;

    const truncate = (value: string, max = 60) => (value.length > max ? `${value.slice(0, max)}…` : value);

    const scoreCell = (score: SeoFieldScore) => (
        <td style={{padding: 8, borderBottom: "1px solid #f0f0f0", verticalAlign: "top", maxWidth: 200}}>
            <div style={{fontWeight: 600, color: scoreColor(Math.round((score.points / score.maxPoints) * 100))}}>
                {score.points}/{score.maxPoints}
            </div>
            <div style={{fontSize: 11, color: "#888", marginTop: 2}}>{score.reason}</div>
            {score.value && (
                <div style={{fontSize: 11, color: "#475569", fontStyle: "italic", marginTop: 2}} title={score.value}>
                    {`"${truncate(score.value)}"`}
                </div>
            )}
        </td>
    );

    const typeLabel = (type: "content" | "taxonomy") => (type === "taxonomy" ? "Taxonomy" : "Content");

    // Collection + locale + slug collapsed into one column: a muted
    // locale/type subtitle on top, and a collection-label > slug breadcrumb
    // underneath, where the slug itself is the edit link — reads like a
    // file path instead of three separate columns repeating "Pages" and
    // "Content" down every row.
    const itemCell = (row: {
        collectionName: TCollectionName;
        label: string;
        type: "content" | "taxonomy";
        locale: TLocale;
        slug: string;
        filename: string;
    }) => (
        <td style={{padding: 8, borderBottom: "1px solid #f0f0f0", verticalAlign: "top"}}>
            <div style={{fontSize: 11, color: "#888"}}>
                {row.locale} · {typeLabel(row.type)}
            </div>
            <div style={{marginTop: 2}}>
                <span style={{fontWeight: 500}}>{row.label}</span>
                <span style={{color: "#94a3b8", margin: "0 4px"}}>›</span>
                <a
                    href={editHref(row)}
                    target="_blank"
                    rel="noopener"
                    style={{color: "#2563eb", textDecoration: "none"}}
                >
                    {row.slug || row.filename} ↗
                </a>
            </div>
        </td>
    );

    return (
        <div style={{padding: 24}}>
            <h1 style={{fontSize: 20, fontWeight: 600, marginBottom: 12}}>SEO Score</h1>
            <div style={{display: "flex", alignItems: "stretch", gap: 16, marginTop: 8, marginBottom: 24}}>

                {/*left — overall score*/}
                <div
                    style={{
                        ...panelStyle,
                        ...scoreCardStyle(overallScore),
                        flex: "0 0 220px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                    }}
                >
                    <div style={{fontSize: 40, fontWeight: 700, lineHeight: 1, color: scoreColor(overallScore)}}>
                        {overallScore}
                    </div>
                    <div style={{fontSize: 12, fontWeight: 500, color: "#666", marginTop: 6}}>
                        average score / 100
                    </div>
                    <div style={{fontSize: 12, color: "#666", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.08)", width: "100%"}}>
                        {imperfectDocsCount === 0
                            ? "Every document scores a perfect 100"
                            : `${imperfectDocsCount} document${imperfectDocsCount === 1 ? "" : "s"} below a perfect score`}
                    </div>
                </div>

                {/*right — rubric legend*/}
                <div style={panelStyle}>
                    <div style={{fontSize: 13, fontWeight: 600, color: "#344054", marginBottom: 8}}>
                        How this is scored (100 points total)
                    </div>
                    <table style={{borderCollapse: "collapse", fontSize: 13}}>
                        <tbody>
                        {RUBRIC.map((r) => (
                            <tr key={r.field}>
                                <td style={{padding: "2px 12px 2px 0", fontWeight: 500, color: "#344054"}}>{r.label}</td>
                                <td style={{padding: "2px 12px 2px 0", color: "#666"}}>{r.points} pts</td>
                                <td style={{padding: "2px 0", color: "#666"}}>{r.rule}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <p style={{fontSize: 12, color: "#888", marginTop: 10, marginBottom: 0, maxWidth: 640}}>
                        Scored on whatever actually renders live — an editor&rsquo;s explicit value, or the page&rsquo;s own
                        automatic fallback (its title/excerpt) when nothing&rsquo;s set. A field using a fallback scores the
                        same as an explicit one but is flagged &ldquo;(using fallback)&rdquo; below, since it may still be worth
                        hand-writing.
                    </p>
                </div>

            </div>
            <table style={{width: "100%", borderCollapse: "collapse", marginBottom: 32}}>
                <thead>
                <tr>
                    <th style={{textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2"}}>Collection</th>
                    {locales.map((locale) => (
                        <th key={locale} style={{textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2"}}>
                            <span>{locale}</span>{" "}
                            <span style={{color: scoreColor(overallByLocale[locale]), fontWeight: 600}}>
                  {overallByLocale[locale]}/100
                </span>
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {coverage.map((row) => (
                    <tr key={row.collectionName}>
                        <td style={{padding: 8, borderBottom: "1px solid #f0f0f0", fontWeight: 500}}>
                            {row.label}
                            {typeBadge(row.type)}
                        </td>
                        {locales.map((locale) => {
                            const score = row.avgScoreByLocale[locale];
                            return (
                                <td
                                    key={locale}
                                    style={{
                                        padding: 8,
                                        borderBottom: "1px solid #f0f0f0",
                                        color: scoreColor(score),
                                        fontWeight: score < 100 ? 600 : 400,
                                    }}
                                >
                                    {score}/100 ({row.countsByLocale[locale]} doc{row.countsByLocale[locale] === 1 ? "" : "s"})
                                </td>
                            );
                        })}
                    </tr>
                ))}
                </tbody>
            </table>

            <h2 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>Documents scoring below 100</h2>
            {audit.length === 0 ? (
                <p style={{color: "#666"}}>Nothing to improve — every document scores a perfect 100.</p>
            ) : (
                <div style={{overflowX: "auto"}}>
                    <table style={{width: "100%", borderCollapse: "collapse"}}>
                        <thead>
                        <tr>
                            <th style={{textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2"}}>Item</th>
                            {RUBRIC.map((r) => (
                                <th key={r.field} style={{textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2"}}>
                                    {r.label}
                                </th>
                            ))}
                            <th style={{textAlign: "left", padding: 8, borderBottom: "1px solid #e2e2e2"}}>Total</th>
                        </tr>
                        </thead>
                        <tbody>
                        {audit.map((row, i) => {
                            const byField = Object.fromEntries(row.scores.map((s) => [s.field, s])) as Record<
                                SeoScoredField,
                                SeoFieldScore
                            >;
                            return (
                                <tr key={i}>
                                    {itemCell(row)}
                                    {RUBRIC.map((r) => (
                                        <React.Fragment key={r.field}>{scoreCell(byField[r.field])}</React.Fragment>
                                    ))}
                                    <td
                                        style={{
                                            padding: 8,
                                            borderBottom: "1px solid #f0f0f0",
                                            fontWeight: 700,
                                            color: scoreColor(row.totalScore),
                                        }}
                                    >
                                        {row.totalScore}/100
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
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
        name: "SEO Score",
        Component: () => <SeoDashboard dashboard={dashboard}/>,
        Icon: SeoIcon,
        layout: "fullscreen",
        navCategory: "Dashboard",
    };
}
