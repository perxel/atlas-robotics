import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getBlogPostQuery, CMSTaxonomy, CMSDictionary, CMSSeo, CMSCollection, type BlogPostItem, getSiteSettings, resolveLocaleAlternates } from "@/lib/cms-server";
import { defaultLocale, CMSMultilingual, buildItemTitle } from "@/lib/registry";
import { translateText } from "@/cms/multilingual";
import BlogPostView from "@/components/blog/BlogPostView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") ||
    CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale, rest: `/${slug}` });
  const [result, settings, alternates, uiDictionary] = await Promise.all([
    getBlogPostQuery(locale, slug),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
    CMSDictionary.loadMap(locale),
  ]);
  const post = result?.data.blog;
  const t = (text: string) => translateText(uiDictionary, text);

  return CMSSeo.buildMetadata({
    lang: locale,
    pathWithoutLocale: CMSMultilingual.stripLocalePrefix(pathname),
    alternates,
    seo: post?.seo,
    fallbackTitle: buildItemTitle({
      collectionName: "blog",
      pageTitle: post?.title,
      label: t(CMSCollection.getLabel("blog")),
      siteTitle: settings?.title || t("Lorem ipsum"),
      t,
    }),
    fallbackDescription: post?.excerpt,
  });
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  const [result, relatedPosts, uiDictionary] = await Promise.all([
    getBlogPostQuery(locale, slug),
    CMSTaxonomy.getRelatedEntries<BlogPostItem>({
      collectionName: "blog",
      taxonomyName: "categories",
      lang: locale,
      slug,
      limit: 3,
    }),
    CMSDictionary.loadMap(locale),
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
      uiDictionary={uiDictionary}
    />
  );
}
