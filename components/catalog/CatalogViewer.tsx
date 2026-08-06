"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TinaMarkdown, type TinaMarkdownContent } from "tinacms/dist/rich-text";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

export type CatalogViewerPage = {
  desktopImage?: string | null;
  mobileImage?: string | null;
  alt?: string | null;
};

export type CatalogViewerTab = {
  slug: string;
  name: string;
  status?: string | null;
  intro?: TinaMarkdownContent | TinaMarkdownContent[] | null;
  pages: CatalogViewerPage[];
};

export default function CatalogViewer({
  tabs,
  initialTabSlug,
  locale,
}: {
  tabs: CatalogViewerTab[];
  initialTabSlug?: string;
  locale: Locale;
}) {
  const dict = getDictionary(locale).catalog;
  const router = useRouter();
  const pathname = usePathname();
  const touchStartX = useRef<number | null>(null);

  const initial = tabs.find((t) => t.slug === initialTabSlug)?.slug || tabs[0]?.slug;
  const [activeSlug, setActiveSlug] = useState(initial);
  const [pageIndex, setPageIndex] = useState(0);

  const activeTab = tabs.find((t) => t.slug === activeSlug) || tabs[0];
  const totalPages = activeTab?.pages.length || 0;

  function selectTab(slug: string) {
    setActiveSlug(slug);
    setPageIndex(0); // tab switch always resets to page one
    router.replace(`${pathname}?tab=${slug}`, { scroll: false });
  }

  function goTo(index: number) {
    if (totalPages === 0) return;
    setPageIndex(((index % totalPages) + totalPages) % totalPages);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      goTo(pageIndex + (delta < 0 ? 1 : -1));
    }
    touchStartX.current = null;
  }

  if (!activeTab) {
    return <p className="text-sm text-muted-foreground">{dict.noTabs}</p>;
  }

  const page = activeTab.pages[pageIndex];

  return (
    <div>
      <div role="tablist" aria-label={dict.tabsAriaLabel} className="flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.slug}
            role="tab"
            aria-selected={tab.slug === activeSlug}
            onClick={() => selectTab(tab.slug)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              tab.slug === activeSlug
                ? "bg-accent text-accent-foreground"
                : "bg-surface-muted text-foreground/70 hover:bg-accent-soft"
            } ${tab.status === "inactive" ? "opacity-50" : ""}`}
          >
            {tab.name}
            {tab.status === "inactive" ? dict.inactiveSuffix : ""}
          </button>
        ))}
      </div>

      {activeTab.intro ? (
        <div className="prose prose-sm mt-4 max-w-none text-muted-foreground">
          <TinaMarkdown content={activeTab.intro} />
        </div>
      ) : null}

      {totalPages > 0 && page ? (
        <>
          <div
            className="relative mt-4 aspect-video w-full touch-pan-y select-none overflow-hidden rounded-lg bg-surface-muted"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.desktopImage || page.mobileImage || ""}
              alt={page.alt || ""}
              className="hidden h-full w-full object-cover md:block"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.mobileImage || page.desktopImage || ""}
              alt={page.alt || ""}
              className="h-full w-full object-cover md:hidden"
            />

            <button
              type="button"
              aria-label={dict.prevPage}
              onClick={() => goTo(pageIndex - 1)}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-surface/90 p-2 text-lg text-foreground shadow hover:bg-surface md:flex"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={dict.nextPage}
              onClick={() => goTo(pageIndex + 1)}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-surface/90 p-2 text-lg text-foreground shadow hover:bg-surface md:flex"
            >
              ›
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2" aria-hidden={totalPages <= 1}>
            {activeTab.pages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={dict.goToPage(i + 1, totalPages)}
                onClick={() => goTo(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === pageIndex ? "bg-accent" : "bg-border hover:bg-accent-soft"
                }`}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{dict.noImages}</p>
      )}

      <div className="mt-8 text-center text-sm">
        <Link href={`${pathname}/text`} className="text-accent underline hover:no-underline">
          {dict.viewTextVersion}
        </Link>
      </div>
    </div>
  );
}
