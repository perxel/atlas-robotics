import { listingPageFilenames } from "@/lib/cms";
import type { Locale } from "@/lib/i18n";

/**
 * Pages listed here render as a fixed layout (title + intro only), ignoring
 * whatever sections editors have added in the admin. The `pages` collection
 * schema always supports block editing (tina/config.ts) — this is a
 * developer-only, per-page override in code, not something editors can
 * toggle themselves.
 */
export const blocksDisabledSlugs = new Set<string>([
  // "home",
]);

export function isBlocksEnabled(slug: string): boolean {
  return !blocksDisabledSlugs.has(slug);
}

/**
 * The `pages` collection resolves at the root of each locale (e.g. `/about`,
 * see app/[locale]/[slug]/page.tsx), so a page can't reuse a slug that a
 * dedicated route already owns — Next.js would resolve to the dedicated
 * route silently (literal segments win over the dynamic sibling), leaving
 * the page unreachable rather than erroring. Enforced in the Tina schema
 * itself via the `slug` field's `ui.validate` (tina/config.ts).
 *
 * Note `blog`/`products` (and their vi spellings) are deliberately NOT
 * reserved here, even though they're dedicated routes — those two are
 * exactly the slugs the locked listing-page documents legitimately use
 * (see `lockedSlugFilenames` below), the same reasoning `home` already
 * gets: a reservation would block the very document that's supposed to
 * hold that slug from ever being saved through the admin.
 */
export const reservedSlugs = new Set<string>(["admin", "api"]);

/**
 * `pages` documents whose `slug` field is locked — checked by
 * `slugLifecycleGuard` (cms/slug/slug-lifecycle-guard.ts),
 * matched by filename (`form.path`'s basename), not by current slug value.
 *
 * `home` and every registered collection's `listingPageFilename` (see
 * lib/cms.ts) end up here. These documents' slugs aren't
 * really a public URL choice: `home` is resolved by the hardcoded key
 * "home" (app/[locale]/page.tsx), and a collection's listing page's real
 * URL segment is owned by `collectionSlugs`, not by this document's slug
 * field — letting an editor "change" a slug that doesn't actually move
 * anything would be actively misleading, so it's blocked outright instead.
 *
 * Also don't delete these documents — nothing currently enforces that
 * (see CLAUDE.md); Tina has no per-document delete-protection hook the
 * way it has `beforeSubmit` for saves, and building around that would
 * mean fighting Tina rather than extending it, so this is a documented
 * convention, not a hard guarantee.
 */
export const lockedSlugFilenames = new Set<string>(["home", ...listingPageFilenames]);

/**
 * The contact page's slug, per locale — content/pages/<locale>/contact.md
 * is a normal `pages` document (see "Migrating an existing fixed route to
 * a pages document" in CLAUDE.md), so its URL is already translated for
 * free via that document's own `slug` field. Code that links to it without
 * running a query (e.g. ProductView's "Get started" button) still needs
 * to know the slug, though — kept here in sync by hand with the real
 * documents. If an editor renames the contact page's slug, update this
 * too (same caveat class as the `home` slug special-cased elsewhere).
 */
export const contactSlug: Record<Locale, string> = {
  en: "contact",
  vi: "lien-he",
};
