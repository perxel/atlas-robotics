import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getBlogPosts, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, "/blog");
  const settings = await getSiteSettings(locale);
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    fallbackTitle: `${dict.blog.pageTitle} — ${settings?.title || dict.siteName}`,
  });
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const posts = await getBlogPosts(locale);
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{dict.blog.pageTitle}</h1>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={localePath(locale, `/blog/${post.slug}`)}
            className="block overflow-hidden rounded-lg border border-border bg-surface hover:border-accent"
          >
            {post.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.coverImage}
                alt={post.coverImageAlt || ""}
                className="aspect-video w-full object-cover"
              />
            )}
            <div className="p-4">
              <h2 className="font-semibold">{post.title}</h2>
              {post.publishDate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(post.publishDate).toLocaleDateString(locale)}
                  {post.author ? ` · ${post.author}` : ""}
                </p>
              )}
              {post.excerpt && <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>}
            </div>
          </Link>
        ))}
      </div>

      {posts.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">{dict.blog.noPosts}</p>
      )}
    </div>
  );
}
