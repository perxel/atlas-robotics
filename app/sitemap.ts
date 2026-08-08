import type {MetadataRoute} from "next";
import {CMSCollection, CMSPages} from "@/lib/cms-server";
import {CMSMultilingual} from "@/lib/registry";
import {siteUrl} from "@/cms/seo";

// Reflects current CMS content on every request, not a snapshot from the
// last build — same reasoning CLAUDE.md's "Production builds require Tina
// Cloud" note already gives for why every route in this app renders
// dynamically: a new page, a changed slug, or a new post all need to show
// up here immediately, with no rebuild/redeploy in between.
export const dynamic = "force-dynamic";

// publishDate is a required field on every content collection (see
// defineContentCollection() / cms/collection/publish-date.field.ts), so
// every entry below gets a real lastModified — no per-collection special
// case for "this one doesn't have a date".
type SitemapCollectionItem = { slug: string; publishDate?: string | null };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
    const enabledLocales = CMSMultilingual.getEnabledLocales();

    // Same non-draft, all-locales index the SEO dashboard reads — reused
    // here instead of a raw pagesConnection query, so this file (like every
    // other route) never imports the generated Tina client directly.
    const pagesIndex = await CMSPages.getSeoIndex();
    for (const page of pagesIndex) {
        if (!enabledLocales.includes(page.locale)) continue;
        entries.push({
            url: `${siteUrl}${CMSCollection.resolvePagesDocumentUrl(page.locale, page.filename, page.slug)}`,
            lastModified: page.publishDate || undefined,
        });
    }

    // Loops every registered collection (lib/registry.ts's collectionPathConfig)
    // instead of a hardcoded blog/products block — adding a collection needs
    // no change here, same "one array, no per-collection call site" registry
    // pattern CMSCollection already uses everywhere else.
    for (const collectionName of CMSCollection.getRegisteredCollectionNames()) {
        for (const locale of enabledLocales) {
            const {items} = await CMSCollection.getCollectionItems<SitemapCollectionItem>({
                collectionName,
                lang: locale,
            });

            for (const item of items) {
                entries.push({
                    url: `${siteUrl}${CMSCollection.getCollectionPath({
                        collectionName,
                        lang: locale,
                        rest: `/${item.slug}`
                    })}`,
                    lastModified: item.publishDate || undefined,
                });
            }
    }
  }

  return entries;
}
