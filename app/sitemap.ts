import type { MetadataRoute } from "next";
import { CMSMultilingual, CMSCollection, siteUrl } from "@/lib/cms";
import { inLocale } from "@/lib/tina-content";
import { client } from "@/tina/__generated__/client";

// Reflects current CMS content on every request, not a snapshot from the
// last build — same reasoning CLAUDE.md's "Production builds require Tina
// Cloud" note already gives for why every route in this app renders
// dynamically: a new page, a changed slug, or a new post all need to show
// up here immediately, with no rebuild/redeploy in between.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  const [pagesRes, blogRes, productsRes] = await Promise.all([
    client.queries.pagesConnection({ filter: { draft: { eq: false } } }),
    client.queries.blogConnection({ filter: { draft: { eq: false } } }),
    client.queries.productsConnection({ filter: { draft: { eq: false } } }),
  ]);

  for (const locale of CMSMultilingual.getEnabledLocales()) {
    for (const doc of inLocale(pagesRes.data.pagesConnection.edges, locale)) {
      const filename = doc._sys.relativePath.split("/").pop()?.replace(/\.md$/, "") ?? "";
      entries.push({
        url: `${siteUrl}${CMSCollection.resolvePagesDocumentUrl(locale, filename, doc.slug)}`,
      });
    }

    for (const doc of inLocale(blogRes.data.blogConnection.edges, locale)) {
      entries.push({
        url: `${siteUrl}${CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale, rest: `/${doc.slug}` })}`,
        lastModified: doc.publishDate || undefined,
      });
    }

    for (const doc of inLocale(productsRes.data.productsConnection.edges, locale)) {
      entries.push({
        url: `${siteUrl}${CMSCollection.getCollectionPath({ collectionName: "products", lang: locale, rest: `/${doc.slug}` })}`,
      });
    }
  }

  return entries;
}
