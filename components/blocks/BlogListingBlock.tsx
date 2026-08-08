import Link from "next/link";
import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksBlogListing } from "@/tina/__generated__/types";
import { translateText } from "@/cms/multilingual";
import { type Locale, collectionPath, taxonomyArchivePath, type CollectionKey, type getBlogPosts } from "@/lib/cms";
import { paginateItems, DEFAULT_PAGE_SIZE } from "@/cms/pagination";
import Pagination from "@/components/Pagination";

const COLLECTION: CollectionKey = "blog";

export default function BlogListingBlock({
  data,
  posts,
  locale,
  currentPage = 1,
  uiDictionary,
}: {
  data: PagesBlocksBlogListing;
  posts: Awaited<ReturnType<typeof getBlogPosts>>;
  locale: Locale;
  currentPage?: number;
  uiDictionary: Record<string, string>;
}) {
  const t = (text: string) => translateText(uiDictionary, text);
  const { items: shown, currentPage: resolvedPage, totalPages } = paginateItems(
    posts,
    currentPage,
    DEFAULT_PAGE_SIZE
  );

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
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
            <Link href={collectionPath(locale, COLLECTION, `/${post.slug}`)}>
              {post.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.coverImage}
                  alt={post.coverImageAlt || ""}
                  className="aspect-video w-full object-cover"
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
                        href={taxonomyArchivePath(COLLECTION, "categories", locale, c.term.slug) ?? "#"}
                        className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-foreground hover:opacity-80"
                      >
                        {c.term.title}
                      </Link>
                    ) : null
                  )}
                </div>
              )}
              <h2 className="font-semibold">
                <Link href={collectionPath(locale, COLLECTION, `/${post.slug}`)}>
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
        basePath={collectionPath(locale, COLLECTION)}
        uiDictionary={uiDictionary}
      />
    </section>
  );
}
