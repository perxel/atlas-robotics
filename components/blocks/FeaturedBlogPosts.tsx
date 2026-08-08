import Link from "next/link";
import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksFeaturedBlogPosts } from "@/tina/__generated__/types";
import { type Locale, CMSCollection, type getBlogPosts } from "@/lib/cms";
import { translateText } from "@/cms/multilingual";

export default function FeaturedBlogPosts({
  data,
  posts,
  locale,
  uiDictionary,
}: {
  data: PagesBlocksFeaturedBlogPosts;
  posts: Awaited<ReturnType<typeof getBlogPosts>>;
  locale: Locale;
  uiDictionary: Record<string, string>;
}) {
  const t = (text: string) => translateText(uiDictionary, text);
  const blogPath = (rest = "") => CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale, rest });
  const shown = posts.slice(0, data.postsToShow || 3);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 data-tina-field={tinaField(data, "heading")} className="text-2xl font-semibold">
          {data.heading}
        </h2>
        {data.subheading && (
          <p
            data-tina-field={tinaField(data, "subheading")}
            className="mt-3 text-muted-foreground"
          >
            {data.subheading}
          </p>
        )}
      </div>

      {shown.length > 0 && (
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((post) => (
            <Link
              key={post.id}
              href={blogPath(`/${post.slug}`)}
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
                <h3 className="font-semibold">{post.title}</h3>
                {post.excerpt && (
                  <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href={blogPath()}
          className="text-sm font-medium text-accent hover:opacity-80"
        >
          {t("View all posts")}
        </Link>
      </div>
    </section>
  );
}
