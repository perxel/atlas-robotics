import type { Metadata } from "next";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { generateBlogMetadata, BlogListing } from "./listing";

// The blog listing is a `pages` document too (fixed filename "blog", same
// pattern as home's fixed "home" — see lib/cms.ts's
// `listingPageFilename` and lib/pages-config.ts's lockedSlugFilenames),
// rendered here rather than through the generic [slug] catch-all: this
// physical route folder has to exist anyway for the nested
// detail/taxonomy-archive/pagination routes (blog/[slug], blog/[slug]/[term],
// blog/page/[pageNum]), and Next.js always resolves a literal folder over a
// same-level dynamic sibling — so deleting this file wouldn't make "/blog"
// fall through to the catch-all, it would just 404. Page 1 of the listing;
// page/[pageNum]/page.tsx handles page >= 2 via the same BlogListing (see
// listing.tsx).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  return generateBlogMetadata(locale);
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  return <BlogListing locale={locale} requestedPage={1} />;
}
