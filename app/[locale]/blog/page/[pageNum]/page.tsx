import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { defaultLocale, isLocale, collectionPath } from "@/lib/cms";
import { parsePageParam } from "@/cms/pagination";
import { generateBlogMetadata, BlogListing } from "../../listing";

// URL: /blog/page/2. Same reasoning as
// app/[locale]/products/page/[pageNum]/page.tsx — this "page" folder is a
// literal URL segment (unrelated to the reserved page.tsx filename inside
// it) that Next.js resolves ahead of the dynamic [slug] post-detail route
// at the same level, so it can't collide with a post's own /blog/<slug>
// URL. Same edge case too: a post literally slugged "page" would become
// unreachable at its detail URL.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; pageNum: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  return generateBlogMetadata(locale);
}

export default async function BlogPageByNumber({
  params,
}: {
  params: Promise<{ locale: string; pageNum: string }>;
}) {
  const { locale: rawLocale, pageNum } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const page = parsePageParam(pageNum);

  if (page === null) notFound();
  // Page 1 already lives at the bare /blog URL — one URL per page.
  if (page <= 1) redirect(collectionPath(locale, "blog"));

  return <BlogListing locale={locale} requestedPage={page} />;
}
