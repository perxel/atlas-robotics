"use client";

import Link from "next/link";
import { useTina, tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import { collectionPath } from "@/lib/cms";
import { taxonomyArchivePath } from "@/lib/cms";
import type { BlogQuery, BlogQueryVariables } from "@/tina/__generated__/types";
import type { getBlogPosts } from "@/lib/cms";
import Breadcrumb from "@/components/Breadcrumb";

export default function BlogPostView({
  query,
  variables,
  data,
  locale,
  relatedPosts,
}: {
  query: string;
  variables: BlogQueryVariables;
  data: BlogQuery;
  locale: Locale;
  relatedPosts: Awaited<ReturnType<typeof getBlogPosts>>;
}) {
  // No-op outside Tina's admin preview iframe — returns `data` unchanged,
  // so this renders identically for normal visitors and the production build.
  const { data: liveData } = useTina({ query, variables, data });
  const post = liveData.blog;
  const dict = getDictionary(locale);

  type CategoryItem = NonNullable<NonNullable<typeof post.categories>[number]>;
  const categories = (post.categories ?? []).filter(
    (c): c is CategoryItem & { term: NonNullable<CategoryItem["term"]> } => !!c?.term
  );

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12">
        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt={post.coverImageAlt || ""}
            data-tina-field={tinaField(post, "coverImage")}
            className="aspect-video w-full rounded-lg object-cover"
          />
        )}

        <h1 data-tina-field={tinaField(post, "title")} className="mt-6 text-3xl font-semibold">
          {post.title}
        </h1>
        <div className="mt-2">
          <Breadcrumb
            items={[
              { label: dict.breadcrumb.home, href: localePath(locale, "/") },
              { label: dict.blog.pageTitle, href: collectionPath(locale, "blog") },
              { label: post.title },
            ]}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {post.publishDate && (
            <span data-tina-field={tinaField(post, "publishDate")}>
              {new Date(post.publishDate).toLocaleDateString(locale)}
            </span>
          )}
          {post.author && <span data-tina-field={tinaField(post, "author")}> · {post.author}</span>}
        </p>

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Link
                key={c.term.slug}
                href={taxonomyArchivePath("blog", "categories", locale, c.term.slug) ?? "#"}
                data-tina-field={tinaField(c)}
                className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-foreground hover:opacity-80"
              >
                {c.term.title}
              </Link>
            ))}
          </div>
        )}

        <div data-tina-field={tinaField(post, "body")} className="prose prose-sm mt-8 max-w-none">
          <TinaMarkdown content={post.body} />
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-xl font-semibold">{dict.blog.related}</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((related) => (
              <Link
                key={related.id}
                href={collectionPath(locale, "blog", `/${related.slug}`)}
                className="block overflow-hidden rounded-lg border border-border bg-surface hover:border-accent"
              >
                {related.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={related.coverImage}
                    alt={related.coverImageAlt || ""}
                    className="aspect-video w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold">{related.title}</h3>
                  {related.publishDate && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(related.publishDate).toLocaleDateString(locale)}
                    </p>
                  )}
                  {related.excerpt && (
                    <p className="mt-2 text-sm text-muted-foreground">{related.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href={collectionPath(locale, "blog")}
              className="inline-block rounded bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              {dict.blog.viewAll}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
