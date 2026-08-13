import type {Collection, Template, TinaField} from "tinacms";
import {slugField, slugLifecycleGuard} from "./slug";
import {authorField, defaultDraftToFalse, draftField, excerptField, localeField, modifiedDateField, publishDateField} from "./collection";
import {seoField} from "./seo";
import {type BeforeSubmitHook, composeBeforeSubmit, stampLocale, stampModifiedDate} from "./tina-hooks";

export type ContentCollectionBody = { kind: "richtext" } | { kind: "blocks"; templates: Template[] };

export type ContentCollectionConfig<TLocale extends string> = {
    name: string;
    label: string;
    /** Defaults to `content/${name}`. */
    path?: string;
    hasAuthor?: boolean;
    /** Short teaser field, shared across collections rather than each
     * hand-rolling its own — see `cms/collection/excerpt.field.ts` for why
     * it's kept separate from `seo.metaDescription` rather than merged
     * into it the way `coverImage` was merged into `seo.ogImage`. Off by
     * default: only worth it for a collection with actual card/listing UI
     * to show it in (`blog`/`products`); a collection with no such
     * listing (`pages`) would just get an unused field. */
    hasExcerpt?: boolean;
    body: ContentCollectionBody;
    /** Pre-built `taxonomyField({ taxonomy, label })` calls — this factory
     * doesn't know about a project's registered taxonomies. Placed right
     * after draft/publishDate/modifiedDate, before even `topFields`. */
    taxonomyFields?: TinaField[];
    /**
     * Explicit position slots instead of one catch-all field bucket — so a
     * schema file states *where* a custom field belongs instead of it
     * landing wherever it was pushed into an array. All three are plain
     * `TinaField[]`; a collection with enough of its own fields to want a
     * visually distinct section can nest them under its own
     * `{ type: "object", ... }` field in any of these — this factory
     * doesn't need to know, since only that collection's own frontend code
     * reads them (unlike draft/publishDate/author/excerpt/taxonomy, which
     * `cms/collection`/`cms/taxonomy`/`cms/tina-hooks` read by a fixed flat
     * key — nesting *those* would mean teaching that framework code to
     * follow paths instead of flat keys, for a form-layout nicety).
     *
     * - `topFields`: right after taxonomy — for a collection's one or two
     *   most important custom fields, e.g. a product's `price`. Draft,
     *   Publish Date, and taxonomy always come first, before even this
     *   slot — an editor should never have to scroll past
     *   collection-specific fields to find them.
     * - `extraFields`: in the standard sequence, after excerpt — secondary
     *   custom fields, e.g. a product's `highlights`.
     * - `bottomFields`: after the body/blocks field, for anything that
     *   only makes sense once the main content is already in view.
     */
    topFields?: TinaField[];
    extraFields?: TinaField[];
    bottomFields?: TinaField[];
    reserved?: Set<string>;
    lockedFilenames?: Set<string>;
    allowedActions?: { create?: boolean; delete?: boolean };
    /** Escape hatch for anything beyond the slug guard + modifiedDate stamp
     * every content collection already gets. */
    extraBeforeSubmitHooks?: BeforeSubmitHook[];
    /**
     * This collection's own per-locale URL segment, e.g.
     * `{ en: "blog", vi: "tin-tuc" }` — the same data as this collection's
     * row in `lib/registry.ts`'s `collectionPathConfig`. Combined with
     * `defaultLocale` to build the admin preview pane's URL
     * (`ui.router`) as `/segment/filename`, locale-prefixed except for
     * `defaultLocale` — the exact formula `CollectionService.getCollectionPath`
     * uses (cms/collection/internal/collection-path.ts), duplicated here on
     * purpose rather than depending on a live `CollectionService` instance:
     * building one needs this same collection's path config already, so
     * depending on it here would make `lib/registry.ts` and this call site
     * import each other — the same "small private copy, not a cross-domain
     * dependency" tradeoff `CollectionService`/`SeoService`/
     * `MultilingualService` each already make for this exact formula.
     */
    locales?: Record<TLocale, string>;
    /** Required together with `locales`. */
    defaultLocale?: TLocale;
    /**
     * Override for the URL-building above — for a collection whose real URL
     * isn't a fixed "/segment/filename" shape. `pages` needs this: its
     * preview URL depends on whether `filename` is `"home"` or matches
     * *another* collection's `listingPageFilename`
     * (`CMSCollection.resolvePagesDocumentUrl`), which only the fully-built
     * `CMSCollection` instance knows — `locales`/`defaultLocale` alone
     * can't express that, so `pages` injects the real thing instead.
     * Takes priority over `locales`/`defaultLocale` when both are given.
     */
    getUrl?: (args: { lang: TLocale; filename: string }) => string;
};

/**
 * The "content collection" primitive this boilerplate is built around: a
 * WordPress-post-shaped Tina collection (title, slug, draft, publishDate,
 * auto-stamped modifiedDate, optional author, optional excerpt, optional
 * taxonomies, a rich-text body or a page-builder `blocks` list, SEO) with
 * the router + beforeSubmit wiring every such collection needs, wired once
 * instead of hand-copied per collection. `blog`/`products`/`pages` are
 * each one call to this in their own `tina/collections/<name>.schema.tsx`
 * file — see those for the concrete per-collection config.
 *
 * Takes `locales`/`defaultLocale` directly (rather than requiring every
 * caller to build a `getUrl` from a live `CollectionService` instance) so
 * `blog`/`products`-shaped collections need only the same plain data
 * already sitting in `lib/registry.ts`'s `collectionPathConfig` — no
 * `lib/cms-server.ts` import at all. `pages` is the one exception, via the
 * `getUrl` override (see that option's own comment for why).
 *
 * Still doesn't also *produce* the `lib/registry.ts`/`lib/cms-server.ts`
 * registry entries (fetchEdges/fetchBySlug, `pageSize`, ...) — those need
 * the actual generated Tina client (server-only), and `lib/registry.ts`
 * importing this call's output back would make it and every
 * `tina/collections/<name>.schema.tsx` file import each other. Adding a
 * collection still means one row in `lib/registry.ts`, one row in
 * `lib/cms-server.ts`, and one call here — three places, but each is a
 * few lines, none re-derive what another already knows, and none of them
 * import each other in a cycle.
 */
export function defineContentCollection<TLocale extends string>(config: ContentCollectionConfig<TLocale>): Collection {
    const getUrl =
        config.getUrl ??
        ((args: { lang: TLocale; filename: string }): string => {
            if (!config.locales || !config.defaultLocale) {
                throw new Error(
                    `defineContentCollection("${config.name}"): pass either { locales, defaultLocale } or getUrl.`
                );
            }
            // Mirrors buildCollectionPath + MultilingualService.localePath
            // exactly (see this option's own doc comment for why it's a
            // copy, not a shared call).
            const pathWithoutLocale = `/${config.locales[args.lang]}/${args.filename}`;
            const clean = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
            return args.lang === config.defaultLocale ? clean || "/" : `/${args.lang}${clean}`;
        });

    const bodyField: TinaField =
        config.body.kind === "blocks"
            ? ({
                type: "object",
                name: "blocks",
                label: "Sections",
                list: true,
                templates: config.body.templates
            } as TinaField)
            : ({type: "rich-text", name: "body", label: "Body", isBody: true} as TinaField);

    // Typed as `Collection` from the start (not built loose then cast at the
    // end) so the `router` callback's `document` param gets Tina's real type
    // via contextual inference — same mechanism the hand-written per-collection
    // schema files this replaces already relied on. A cast at the end instead
    // would type-check `document` as whatever a bare object literal infers,
    // which doesn't reliably match Tina's actual `router` signature.
    const collection: Collection = {
        name: config.name,
        label: config.label,
        path: config.path ?? `content/${config.name}`,
        format: "md",
        // Prefills `publishDate` to "now" when an editor clicks "Add
        // Document" — that field is `required: true` (an editor-chosen
        // freshness signal, unlike auto-stamped `modifiedDate`) but Tina
        // never fills a required field on its own, so without this the
        // form opens already failing validation. `defaultItem` is flagged
        // `@deprecated` on `BaseCollection` in favor of `ui.defaultItem`
        // per-template, but that alternative only exists for
        // `TemplateCollection`s (a `templates` union, e.g. this
        // collection's own `blocks` list); a plain `fields`-based
        // `FieldCollection` like this one has no non-deprecated
        // replacement, so this is the correct mechanism here, not a stale
        // API being reached for.
        defaultItem: () => ({publishDate: new Date().toISOString()}),
        ui: {
            ...(config.allowedActions ? {allowedActions: config.allowedActions} : {}),
            // Derived from the filename (_sys.breadcrumbs), never the `slug`
            // field — `document` here only reliably carries `_sys` at runtime,
            // matching its TypeScript type (confirmed live pre-refactor: reading
            // `document.slug` produced a broken preview URL with a literal
            // "undefined"). Matches Tina's own docs example.
            router: ({document}) => {
                const locale = document._sys.breadcrumbs[0] as TLocale;
                const filename = document._sys.breadcrumbs[document._sys.breadcrumbs.length - 1];
                return getUrl({lang: locale, filename});
            },
            beforeSubmit: composeBeforeSubmit([
                slugLifecycleGuard(config.name, {lockedFilenames: config.lockedFilenames}),
                defaultDraftToFalse,
                stampModifiedDate,
                stampLocale,
                ...(config.extraBeforeSubmitHooks ?? []),
            ]),
        },
        // Deliberately ordered, not just concatenated: identity fields
        // first, then draft/publishDate/modifiedDate/taxonomy — always
        // visible without scrolling past whatever a specific collection
        // adds — then this collection's own headline field(s), then its
        // secondary fields, then SEO, and the main content editing
        // surface (body/blocks) last — so an editor confirms all the
        // metadata before landing in the longest part of the form, not
        // the reverse. See `topFields`/`extraFields`/`bottomFields`'s own
        // comment for the reasoning behind naming slots instead of one
        // array.
        fields: [
            {type: "string", name: "title", label: "Title", required: true},
            slugField({reserved: config.reserved}),
            ...(config.hasExcerpt ? [excerptField()] : []),
            draftField(),
            publishDateField(),
            modifiedDateField(),
            localeField(),
            ...(config.taxonomyFields ?? []),
            ...(config.hasAuthor ? [authorField()] : []),
            seoField(),
            ...(config.topFields ?? []),
            ...(config.extraFields ?? []),
            bodyField,
            ...(config.bottomFields ?? []),
        ],
    };

    return collection;
}
