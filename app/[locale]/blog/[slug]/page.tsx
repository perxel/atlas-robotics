import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { StaticTinaMarkdown } from "tinacms/dist/rich-text/static";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getBlogPostBySlug, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, `/blog/${slug}`);
  const [post, settings] = await Promise.all([
    getBlogPostBySlug(locale, slug),
    getSiteSettings(locale),
  ]);

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
  const post = await getBlogPostBySlug(locale, slug);

  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt={post.coverImageAlt || ""}
          className="aspect-video w-full rounded-lg object-cover"
        />
      )}

      <h1 className="mt-6 text-3xl font-semibold">{post.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {post.publishDate && new Date(post.publishDate).toLocaleDateString(locale)}
        {post.author ? ` · ${post.author}` : ""}
      </p>

      <div className="prose prose-sm mt-8 max-w-none">
        <StaticTinaMarkdown content={post.body} />
      </div>
    </article>
  );
}
