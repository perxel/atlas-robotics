import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getBlogPosts, getCategories, getSiteSettings, filterByTaxonomyTerm } from "@/lib/tina-content";
import { getTaxonomyRegistryEntry } from "@/lib/taxonomies";
import { getDictionary } from "@/lib/dictionary";
import { collectionPath } from "@/lib/collection-slugs";
import { resolveLocaleAlternates } from "@/lib/locale-alternates";
import type { Locale } from "@/lib/i18n";

/**
 * Generic archive route for any taxonomy attached to `blog` (see
 * lib/taxonomies.ts) — the first segment is the registry's `urlSegment`
 * (e.g. "category"), the second is the term document's slug. Adding a
 * taxonomy to blog needs one registry row plus a case in `resolveTerm`
 * below — everything else (route matching, post filtering) already
 * generalizes via the registry and `filterByTaxonomyTerm`.
 *
 * The folder is named `[slug]`, not `[taxonomy]`, only because Next.js
 * requires every dynamic segment at the same route level to share one
 * parameter name — this level already has `[slug]` from the sibling post
 * detail route (app/[locale]/blog/[slug]/page.tsx), so this route reuses
 * that name (confirmed live: naming it `[taxonomy]` instead broke the
 * whole app with "You cannot use different slug names for the same
 * dynamic path"). Destructured as `taxonomySegment` below for clarity.
 */
async function resolveTerm(taxonomy: string, locale: Locale, termSlug: string) {
  if (taxonomy !== "categories") return null;
  const categories = await getCategories(locale);
  return categories.find((c) => c.slug === termSlug) || null;
}

async function loadArchive(locale: Locale, taxonomySegment: string, termSlug: string) {
  const entry = getTaxonomyRegistryEntry("blog", taxonomySegment);
  if (!entry) return null;

  const term = await resolveTerm(entry.taxonomy, locale, termSlug);
  if (!term) return null;

  const posts = await getBlogPosts(locale);
  const filtered = filterByTaxonomyTerm(posts, entry.fieldName, termSlug);

  return { term, posts: filtered };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") ||
    collectionPath(locale, "blog", `/${taxonomySegment}/${termSlug}`);
  const [archive, settings, alternates] = await Promise.all([
    loadArchive(locale, taxonomySegment, termSlug),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
  ]);
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    alternates,
    fallbackTitle: archive
      ? `${archive.term.title} — ${dict.blog.pageTitle} — ${settings?.title || dict.siteName}`
      : dict.blog.pageTitle,
  });
}

export default async function BlogTaxonomyArchivePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string }>;
}) {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);
  const archive = await loadArchive(locale, taxonomySegment, termSlug);

  if (!archive) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-sm text-muted-foreground">
        <Link href={collectionPath(locale, "blog")} className="hover:text-accent">
          {dict.blog.pageTitle}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{archive.term.title}</h1>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {archive.posts.map((post) => (
          <Link
            key={post.id}
            href={collectionPath(locale, "blog", `/${post.slug}`)}
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

      {archive.posts.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">{dict.blog.noPosts}</p>
      )}
    </div>
  );
}
