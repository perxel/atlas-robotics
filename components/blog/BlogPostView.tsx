"use client";

import Link from "next/link";
import { useTina, tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import { sectionPath } from "@/lib/section-slugs";
import type { BlogQuery, BlogQueryVariables } from "@/tina/__generated__/types";
import Breadcrumb from "@/components/Breadcrumb";

export default function BlogPostView({
  query,
  variables,
  data,
  locale,
}: {
  query: string;
  variables: BlogQueryVariables;
  data: BlogQuery;
  locale: Locale;
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

      <h1
        data-tina-field={tinaField(post, "title")}
        className="mt-6 text-3xl font-semibold"
      >
        {post.title}
      </h1>
      <div className="mt-2">
        <Breadcrumb
          items={[
            { label: dict.breadcrumb.home, href: localePath(locale, "/") },
            { label: dict.blog.pageTitle, href: sectionPath(locale, "blog") },
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
        {post.author && (
          <span data-tina-field={tinaField(post, "author")}> · {post.author}</span>
        )}
      </p>

      {categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <Link
              key={c.term.slug}
              href={sectionPath(locale, "blog", `/category/${c.term.slug}`)}
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
  );
}
