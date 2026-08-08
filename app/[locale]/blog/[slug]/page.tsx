import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getSiteSettings } from "@/lib/tina-content";
import { getBlogPostQuery, CMSTaxonomy, type BlogPostItem } from "@/lib/cms";
import { getDictionary } from "@/lib/dictionary";
import { collectionPath } from "@/lib/cms";
import { resolveLocaleAlternates } from "@/lib/locale-alternates";
import BlogPostView from "@/components/blog/BlogPostView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || collectionPath(locale, "blog", `/${slug}`);
  const [result, settings, alternates] = await Promise.all([
    getBlogPostQuery(locale, slug),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
  ]);
  const post = result?.data.blog;
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    alternates,
    seo: post?.seo,
    fallbackTitle: post?.title || `${dict.blog.pageTitle} — ${settings?.title || dict.siteName}`,
    fallbackDescription: post?.excerpt,
    fallbackOgImage: post?.coverImage,
  });
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const [result, relatedPosts] = await Promise.all([
    getBlogPostQuery(locale, slug),
    CMSTaxonomy.getRelatedEntries<BlogPostItem>({
      collectionName: "blog",
      taxonomyName: "categories",
      lang: locale,
      slug,
      limit: 3,
    }),
  ]);

  // getBlogPostQuery resolves the slug via a draft-filtered query, so a
  // draft post already can't be reached here — including inside Tina's own
  // admin preview pane while editing it. See the "Drafts" note in
  // CLAUDE.md for what full draft-preview support would additionally need.
  if (!result) notFound();

  return (
    <BlogPostView
      query={result.query}
      variables={result.variables}
      data={result.data}
      locale={locale}
      relatedPosts={relatedPosts}
    />
  );
}
