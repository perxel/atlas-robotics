import Link from "next/link";
import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksBlogListing } from "@/tina/__generated__/types";
import { translateText } from "@/cms/multilingual";
import type { Locale, CollectionKey, BlogPostItem } from "@/lib/cms-server";
import { CMSCollection, CMSTaxonomy } from "@/lib/registry";
import { paginateItems } from "@/cms/pagination";
import Pagination from "@/components/Pagination";
import CoverMedia from "@/components/CoverMedia";

const COLLECTION: CollectionKey = "blog";

export default function BlogListingBlock({
  data,
  posts,
  locale,
  currentPage = 1,
  uiDictionary,
}: {
  data: PagesBlocksBlogListing;
  posts: BlogPostItem[];
  locale: Locale;
  currentPage?: number;
  uiDictionary: Record<string, string>;
}) {
  const t = (text: string) => translateText(uiDictionary, text);
  const blogPath = (rest = "") => CMSCollection.getCollectionPath({ collectionName: COLLECTION, lang: locale, rest });
  const { items: shown, currentPage: resolvedPage, totalPages } = paginateItems(
    posts,
    currentPage,
    CMSCollection.getPageSize(COLLECTION)
  );

  return (
    <section className="my-container py-12">
      {data.subheading && (
        <p
          data-tina-field={tinaField(data, "subheading")}
          className="mb-8 text-sm text-muted-foreground"
        >
          {data.subheading}
        </p>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        {shown.map((post) => (
          <div
            key={post.id}
            className="overflow-hidden rounded-lg border border-border bg-surface hover:border-accent"
          >
            <Link href={blogPath(`/${post.slug}`)}>
              {post.seo?.ogImage && (
                <CoverMedia
                  src={post.seo.ogImage}
                  alt={post.seo.ogImageAlt || post.title}
                  className="aspect-video w-full object-cover"
                  sizes="(min-width: 640px) 50vw, 100vw"
                />
              )}
            </Link>
            <div className="p-4">
              {post.categories && post.categories.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {post.categories.map((c) =>
                    c?.term ? (
                      <Link
                        key={c.term.slug}
                        href={
                          CMSTaxonomy.getArchivePath({
                            collectionName: COLLECTION,
                            taxonomyName: "categories",
                            lang: locale,
                            termSlug: c.term.slug,
                          }) ?? "#"
                        }
                        className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent hover:opacity-80"
                      >
                        {c.term.title}
                      </Link>
                    ) : null
                  )}
                </div>
              )}
              <h2 className="font-semibold">
                <Link href={blogPath(`/${post.slug}`)}>
                  {post.title}
                </Link>
              </h2>
              {post.publishDate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(post.publishDate).toLocaleDateString(locale)}
                  {post.author ? ` · ${post.author}` : ""}
                </p>
              )}
              {post.excerpt && <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>}
            </div>
          </div>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">{t("No posts published yet.")}</p>
      )}

      <Pagination
        currentPage={resolvedPage}
        totalPages={totalPages}
        basePath={blogPath()}
        uiDictionary={uiDictionary}
      />
    </section>
  );
}
