"use client";

import Link from "next/link";
import { useTina, tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import type { Locale, BlogPostItem } from "@/lib/cms-server";
import { CMSMultilingual, CMSCollection, CMSTaxonomy } from "@/lib/registry";
import { siteUrl } from "@/cms/seo";
import { translateText } from "@/cms/multilingual";
import { buildBreadcrumbJsonLd, type BreadcrumbItem } from "@/cms/seo";
import type { BlogQuery, BlogQueryVariables } from "@/tina/__generated__/types";
import Breadcrumb from "@/components/Breadcrumb";
import CoverMedia from "@/components/CoverMedia";
import MediaGrid from "@/components/MediaGrid";

export default function BlogPostView({
  query,
  variables,
  data,
  locale,
  relatedPosts,
  uiDictionary,
}: {
  query: string;
  variables: BlogQueryVariables;
  data: BlogQuery;
  locale: Locale;
  relatedPosts: BlogPostItem[];
  uiDictionary: Record<string, string>;
}) {
  // No-op outside Tina's admin preview iframe — returns `data` unchanged,
  // so this renders identically for normal visitors and the production build.
  const { data: liveData } = useTina({ query, variables, data });
  const post = liveData.blog;
  const t = (text: string) => translateText(uiDictionary, text);
  const blogPath = (rest = "") => CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale, rest });

  type CategoryItem = NonNullable<NonNullable<typeof post.categories>[number]>;
  const categories = (post.categories ?? []).filter(
    (c): c is CategoryItem & { term: NonNullable<CategoryItem["term"]> } => !!c?.term
  );

  const trail: BreadcrumbItem[] = [
    { label: t("Home"), href: CMSMultilingual.localePath(locale, "/") },
    { label: t(CMSCollection.getLabel("blog")), href: blogPath() },
    { label: post.title },
  ];

  return (
    <>
      <article className="my-container py-12">
        {post.seo?.ogImage && (
          <CoverMedia
            src={post.seo.ogImage}
            alt={post.seo.ogImageAlt || post.title}
            dataTinaField={tinaField(post.seo, "ogImage")}
            className="aspect-video w-full rounded-lg object-cover"
            sizes="(min-width: 1152px) 1152px, 100vw"
          />
        )}

        <h1 data-tina-field={tinaField(post, "title")} className="mt-6 text-3xl font-semibold">
          {post.title}
        </h1>
        <div className="mt-2">
          <Breadcrumb items={trail} />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(trail, siteUrl)) }}
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
                href={
                  CMSTaxonomy.getArchivePath({
                    collectionName: "blog",
                    taxonomyName: "categories",
                    lang: locale,
                    termSlug: c.term.slug,
                  }) ?? "#"
                }
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

        <MediaGrid items={post.gallery ?? []} heading={t("Gallery")} />
      </article>

      {relatedPosts.length > 0 && (
        <section className="mx-auto my-container px-4 pb-16">
          <h2 className="text-xl font-semibold">{t("Related posts")}</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((related) => (
              <Link
                key={related.id}
                href={blogPath(`/${related.slug}`)}
                className="block overflow-hidden rounded-lg border border-border bg-surface hover:border-accent"
              >
                {related.seo?.ogImage && (
                  <CoverMedia
                    src={related.seo.ogImage}
                    alt={related.seo.ogImageAlt || related.title}
                    className="aspect-video w-full object-cover"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
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
              href={blogPath()}
              className="inline-block rounded bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              {t("View all posts")}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
