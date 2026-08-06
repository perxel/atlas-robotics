import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getBlogPostQuery, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
import BlogPostView from "@/components/blog/BlogPostView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, `/blog/${slug}`);
  const [result, settings] = await Promise.all([
    getBlogPostQuery(locale, slug),
    getSiteSettings(locale),
  ]);
  const post = result?.data.blog;
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
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
  const result = await getBlogPostQuery(locale, slug);

  if (!result) notFound();

  return (
    <BlogPostView
      query={result.query}
      variables={result.variables}
      data={result.data}
      locale={locale}
    />
  );
}
