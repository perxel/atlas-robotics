# Domain: SEO

See [`00-overview.md`](./00-overview.md) for cross-domain rules this file
assumes. The SEO Dashboard depends on [`01-collection.md`](./01-collection.md)
(Option A injection, Addendum #4 there).

Two pieces: `SeoService` (the existing `buildMetadata`/`buildAlternates` logic
from `lib/seo.ts`, ported to a class) and a **SEO Dashboard** — same idea and
same construction as the Translation Dashboard (`03-multilingual.md`),
tracking completeness of `metaTitle`/`metaDescription`/`ogImage`/`ogImageAlt`
per document per locale instead of translation existence. Breadcrumb (see
bottom of this file) is folded in here too.

## `cms/seo/` (generic, reusable, no project data)

```
cms/seo/
  types.ts                # SeoFields, SeoAuditRow<TCollectionName, TLocale>,
                           # SeoCoverage<TCollectionName, TLocale>
  SeoService.ts             # buildMetadata / buildAlternates
  field.ts                   # seoField() — straight move, already generic
  dashboard/
    SeoDashboardService.ts     # coverage + audit, same shape as Translation Dashboard
    createSeoDashboardScreen.tsx # Tina ScreenPlugin (admin-only UI, JSX exception)
  breadcrumb/
    types.ts                     # BreadcrumbItem = { label: string; href?: string }
    build-breadcrumb-json-ld.ts    # buildBreadcrumbJsonLd(trail, siteUrl):
                                    # schema.org BreadcrumbList object
```

## `SeoService` public API

```ts
class SeoService<TLocale extends string> {
  constructor(options: { siteUrl: string; defaultLocale: TLocale; locales: readonly TLocale[] })

  buildAlternates(args: {
    pathWithoutLocale: string; lang: TLocale; alternates: Partial<Record<TLocale, string>>;
  }): { canonical: string; languages: Record<string, string> }

  buildMetadata(args: {
    lang: TLocale; pathWithoutLocale: string;
    alternates?: Partial<Record<TLocale, string>>;   // resolved externally — see below
    seo?: SeoFields;
    fallbackTitle: string; fallbackDescription?: string | null; fallbackOgImage?: string | null;
  }): Metadata   // Next.js Metadata — same shape/behavior as today's buildMetadata
}
```

`alternates` stays a plain input, not something `SeoService` resolves itself
via an injected Collection/Taxonomy capability (unlike `TaxonomyService`'s
Option A). Reason: "what's this page's alternates map" already has four
different resolution strategies depending on route type (collection detail
page, collection listing page, a `pages` document, or a taxonomy archive —
see today's `resolveLocaleAlternates`), and that dispatch logic already has
one home. Re-deciding it a second time inside `cms/seo` would duplicate it,
not simplify it. `SeoService` stays a pure "given a locale, a resolved
alternates map, and this document's SEO fields, build the tags" function.

## SEO Dashboard (Tina admin Screen)

Same construction as the Translation Dashboard: a coverage summary
(`getCoverage()`) plus a detail audit table (`getAudit()`) showing every
document's actual current SEO text across every locale, filterable to
only-incomplete rows.

```ts
type SeoAuditRow<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  locale: TLocale;
  slug: string;
  filename: string;
  seo: SeoFields;                          // the actual current values — "see current seo text"
  missingFields: Array<keyof SeoFields>;     // required fields that are genuinely empty
  usingFallback: Array<keyof SeoFields>;      // empty but a site-wide fallback covers it —
                                               // tracked separately from `missingFields` so
                                               // coverage % reflects real gaps, not
                                               // "hasn't been hand-tuned yet" — this is the
                                               // decided default; revisit if it doesn't feel
                                               // right in practice
};

type SeoCoverage<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  countsByLocale: Record<TLocale, number>;
  completeByLocale: Record<TLocale, number>;        // every required field explicitly set
  completionPercentByLocale: Record<TLocale, number>;
};

class SeoDashboardService<TCollectionName extends string, TLocale extends string> {
  constructor(
    deps: {
      getRegisteredCollectionNames: () => TCollectionName[];
      getSeoIndex: (collectionName: TCollectionName)
        => Promise<{ filename: string; locale: TLocale; slug: string; seo: SeoFields }[]>;
    },
    options: {
      locales: readonly TLocale[];
      defaultLocale: TLocale;
      requiredFields?: Array<keyof SeoFields>;   // defaults to ["metaTitle", "metaDescription"];
                                                  // a project decides whether ogImage is mandatory
    }
  )

  getCoverage(): Promise<SeoCoverage<TCollectionName, TLocale>[]>
  getAudit(args?: { collectionName?: TCollectionName; onlyMissing?: boolean })
    : Promise<SeoAuditRow<TCollectionName, TLocale>[]>
}

function createSeoDashboardScreen(dashboard: SeoDashboardService<any, any>): ScreenPlugin
```

Needs a new optional registry capability on `CollectionService` —
`fetchSeoIndex` — documented as Addendum #4 in `01-collection.md`.

## `lib/cms.ts` additions

```ts
export const CMSSeo = new SeoService({ siteUrl, defaultLocale, locales });

export const seoDashboardScreen = createSeoDashboardScreen(new SeoDashboardService(
  {
    getRegisteredCollectionNames: () => ["blog", "products", "pages"],
    getSeoIndex: CMSCollection.getSeoIndex.bind(CMSCollection),
  },
  { locales, defaultLocale }
));
// unlike the Translation Dashboard, not gated behind CMSMultilingual.isEnabled() —
// SEO completeness matters even on a single-locale site
```

```ts
// tina/config.ts
cmsCallback: (cms) => {
  if (translationDashboardScreen) cms.plugins.add(translationDashboardScreen);
  cms.plugins.add(seoDashboardScreen);
  return cms;
},
```

## Breadcrumb (folded in here, not its own domain)

The trail data (`Home > Blog > Post Title`) has two consumers: the UI list
(`components/Breadcrumb.tsx`, unchanged — still pure props-in, no logic to
extract) and breadcrumb `JSON-LD` structured data for search engines, which
this app has no structured data of any kind for yet. Same array, two
outputs, and generating the JSON-LD is squarely an SEO job — so the shared
type and the JSON-LD builder live under `cms/seo/breadcrumb/`, not as their
own domain.

Deliberately **not** a class with injected Collection/Taxonomy capabilities
(unlike Taxonomy → Collection) — same reasoning `SeoService.buildMetadata`
already applies to its `alternates` argument: which URLs/labels belong in a
page's trail differs by route type (collection detail vs. listing vs. a
`pages` doc vs. a taxonomy archive), and that dispatch already needs to
happen once, at the call site, using whichever `CMSCollection`/`CMSTaxonomy`
path builders are relevant there. Re-deciding it inside `cms/seo` too would
duplicate that dispatch, not simplify it — so this stays plain functions
over an already-built `BreadcrumbItem[]`, matching the Pagination domain's
reasoning for staying function-based rather than class-based.

```ts
function buildBreadcrumbJsonLd(trail: BreadcrumbItem[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  };
}
```

```ts
// call site, e.g. a blog post detail page — the page itself builds the
// trail using whatever path builders it already needs
const trail: BreadcrumbItem[] = [
  { label: __("Home"), href: "/" },
  { label: __("Blog"), href: CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale }) },
  { label: post.title },   // current page, no href
];

<Breadcrumb items={trail} />
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(trail, siteUrl)) }} />
```
