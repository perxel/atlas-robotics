import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { translateText } from "@/cms/multilingual";
import { paginateItems, redirectIfPageMismatch } from "@/cms/pagination";
import Pagination from "@/components/Pagination";
import {
  type Locale,
  CMSCollection,
  CMSTaxonomy,
  CMSDictionary,
  CMSSeo,
  type BlogPostItem,
  getSiteSettings,
  resolveLocaleAlternates,
} from "@/lib/cms-server";
import { CMSMultilingual } from "@/lib/registry";

/**
 * Generic archive route for any taxonomy attached to `blog` (see
 * lib/cms-server.ts's CMSTaxonomy registration) — the first segment is the
 * registry's `urlSegment` (e.g. "category"), the second is the term
 * document's slug. Adding a taxonomy to blog needs one registry row in
 * lib/cms-server.ts — everything else (route matching, term lookup, post
 * filtering) already generalizes via CMSTaxonomy.
 *
 * The folder above this one is named `[slug]`, not `[taxonomy]`, only
 * because Next.js requires every dynamic segment at the same route level
 * to share one parameter name — that level already has `[slug]` from the
 * sibling post detail route (app/[locale]/blog/[slug]/page.tsx). Destructured
 * as `taxonomySegment` below for clarity.
 *
 * Not a route file itself — shared by page.tsx (page 1, canonical) and
 * page/[pageNum]/page.tsx (page >= 2), same as app/[locale]/blog/listing.tsx
 * for the main listing page.
 */
async function loadArchive(locale: Locale, taxonomySegment: string, termSlug: string) {
  const taxonomyName = CMSTaxonomy.resolveUrlSegment({
    collectionName: "blog",
    lang: locale,
    urlSegment: taxonomySegment,
  });
  if (!taxonomyName) return null;

  const term = await CMSTaxonomy.getTerm({ taxonomyName, lang: locale, slug: termSlug });
  if (!term) return null;

  const { items: posts } = await CMSTaxonomy.getItemsByTerm<BlogPostItem>({
    collectionName: "blog",
    taxonomyName,
    termSlug,
    lang: locale,
  });

  return { term, posts };
}

export async function generateBlogArchiveMetadata(
  locale: Locale,
  taxonomySegment: string,
  termSlug: string
): Promise<Metadata> {
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") ||
    CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale, rest: `/${taxonomySegment}/${termSlug}` });
  const [archive, settings, alternates, uiDictionary] = await Promise.all([
    loadArchive(locale, taxonomySegment, termSlug),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
    CMSDictionary.loadMap(locale),
  ]);
  const t = (text: string) => translateText(uiDictionary, text);

  return CMSSeo.buildMetadata({
    lang: locale,
    pathWithoutLocale: CMSMultilingual.stripLocalePrefix(pathname),
    alternates,
    fallbackTitle: archive
      ? `${archive.term.title} — ${t("Blog")} — ${settings?.title || t("Lorem ipsum")}`
      : t("Blog"),
  });
}

export async function BlogArchive({
  locale,
  taxonomySegment,
  termSlug,
  requestedPage,
}: {
  locale: Locale;
  taxonomySegment: string;
  termSlug: string;
  requestedPage: number;
}) {
  const [archive, uiDictionary] = await Promise.all([
    loadArchive(locale, taxonomySegment, termSlug),
    CMSDictionary.loadMap(locale),
  ]);
  const t = (text: string) => translateText(uiDictionary, text);

  if (!archive) notFound();

  const basePath = CMSCollection.getCollectionPath({
    collectionName: "blog",
    lang: locale,
    rest: `/${taxonomySegment}/${termSlug}`,
  });
  const { items: shown, currentPage, totalPages } = paginateItems(archive.posts, requestedPage);
  redirectIfPageMismatch(requestedPage, currentPage, basePath);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-sm text-muted-foreground">
        <Link
          href={CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale })}
          className="hover:text-accent"
        >
          {t("Blog")}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{archive.term.title}</h1>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {shown.map((post) => (
          <Link
            key={post.id}
            href={CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale, rest: `/${post.slug}` })}
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

      {shown.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">{t("No posts published yet.")}</p>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={basePath}
        uiDictionary={uiDictionary}
      />
    </div>
  );
}
