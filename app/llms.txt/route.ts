import { CMSCollection, CMSPages, getSiteSettings } from "@/lib/cms-server";
import type { SeoFields } from "@/cms/seo";
import { siteUrl } from "@/cms/seo";
import { defaultLocale } from "@/lib/registry";

// llms.txt (https://llmstxt.org) has no Next.js file convention of its own
// (unlike robots.ts/sitemap.ts), so it's a plain route handler at the
// literal "/llms.txt" path — middleware.ts's matcher already excludes any
// path with a dot, same reasoning app/robots.ts documents for /robots.txt.
// Reflects current CMS content on every request, same as app/sitemap.ts.
export const dynamic = "force-dynamic";

type IndexedItem = { title: string; slug: string; excerpt?: string | null };

function formatLinks(items: { title: string; url: string; description?: string | null }[]): string {
  return items
    .map(({ title, url, description }) => {
      const desc = description?.trim();
      return desc ? `- [${title}](${url}): ${desc}` : `- [${title}](${url})`;
    })
    .join("\n");
}

export async function GET() {
  const locale = defaultLocale;

  const [siteSettings, pagesIndex] = await Promise.all([getSiteSettings(locale), CMSPages.getSeoIndex()]);

  const pageLinks = pagesIndex
    .filter((page) => page.locale === locale && page.filename !== "404")
    .map((page) => {
      const seo = page.seo as SeoFields;
      return {
        title: seo?.metaTitle || page.fallback.metaTitle || page.slug,
        url: `${siteUrl}${CMSCollection.resolvePagesDocumentUrl(locale, page.filename, page.slug)}`,
        description: seo?.metaDescription ?? page.fallback.metaDescription,
      };
    });

  // Same registry loop app/sitemap.ts uses (CMSCollection.getRegisteredCollectionNames())
  // rather than hand-listing "blog"/"products" here a second time — a new
  // collection registered in lib/registry.ts shows up here with no route change.
  const collectionSections = await Promise.all(
    CMSCollection.getRegisteredCollectionNames().map(async (collectionName) => {
      const { items } = await CMSCollection.getCollectionItems<IndexedItem>({ collectionName, lang: locale });
      if (!items.length) return null;
      const links = items.map((item) => ({
        title: item.title,
        url: `${siteUrl}${CMSCollection.getCollectionPath({ collectionName, lang: locale, rest: `/${item.slug}` })}`,
        description: item.excerpt,
      }));
      return `## ${CMSCollection.getLabel(collectionName)}\n\n${formatLinks(links)}`;
    })
  );

  const title = siteSettings?.title || "Site";
  const summary = siteSettings?.defaultSeo?.metaDescription;

  const sections = [pageLinks.length ? `## Pages\n\n${formatLinks(pageLinks)}` : null, ...collectionSections].filter(
    (section): section is string => section !== null
  );

  const body = [`# ${title}`, summary ? `> ${summary}` : null, ...sections]
    .filter((part): part is string => part !== null)
    .join("\n\n");

  return new Response(`${body}\n`, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
