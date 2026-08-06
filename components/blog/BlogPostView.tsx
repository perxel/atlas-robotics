"use client";

import { useTina, tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import type { Locale } from "@/lib/i18n";
import type { BlogQuery, BlogQueryVariables } from "@/tina/__generated__/types";

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
      <p className="mt-2 text-sm text-muted-foreground">
        {post.publishDate && (
          <span data-tina-field={tinaField(post, "publishDate")}>
            {new Date(post.publishDate).toLocaleDateString(locale)}
          </span>
        )}
        {post.author && (
          <span data-tina-field={tinaField(post, "author")}> · {post.author}</span>
        )}
      </p>

      <div data-tina-field={tinaField(post, "body")} className="prose prose-sm mt-8 max-w-none">
        <TinaMarkdown content={post.body} />
      </div>
    </article>
  );
}
