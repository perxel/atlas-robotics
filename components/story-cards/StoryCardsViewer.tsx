"use client";

import { useRef, useState } from "react";
import { TinaMarkdown, type TinaMarkdownContent } from "tinacms/dist/rich-text";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

export type StoryCardAttribute = { name?: string | null; value?: string | null };

export type StoryCardItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  primaryImage?: string | null;
  secondaryImage?: string | null;
  attachmentPdf?: string | null;
  attributes?: (StoryCardAttribute | null)[] | null;
  body?: TinaMarkdownContent | TinaMarkdownContent[] | null;
};

export default function StoryCardsViewer({
  cards,
  locale,
}: {
  cards: StoryCardItem[];
  locale: Locale;
}) {
  const dict = getDictionary(locale).storyCards;
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (!cards.length) {
    return <p className="text-sm text-muted-foreground">{dict.noCards}</p>;
  }

  function goTo(index: number) {
    setActiveIndex(((index % cards.length) + cards.length) % cards.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      goTo(activeIndex + (delta < 0 ? 1 : -1));
    }
    touchStartX.current = null;
  }

  const active = cards[activeIndex];

  return (
    <div>
      <div
        role="tablist"
        aria-label={dict.tabsAriaLabel}
        className="flex gap-2 overflow-x-auto pb-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {cards.map((card, i) => (
          <button
            key={card.id}
            role="tab"
            aria-selected={i === activeIndex}
            onClick={() => goTo(i)}
            className={`shrink-0 rounded-lg border px-4 py-2 text-left text-sm transition-colors ${
              i === activeIndex
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-surface text-foreground/70 hover:border-accent"
            }`}
          >
            {card.title}
          </button>
        ))}
      </div>

      <div
        className="mt-6 grid gap-6 rounded-lg border border-border bg-surface p-6 md:grid-cols-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-2 gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.primaryImage || ""}
            alt=""
            className="col-span-2 aspect-video w-full rounded-md object-cover"
          />
          {active.secondaryImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.secondaryImage}
              alt=""
              className="col-span-2 aspect-video w-full rounded-md object-cover"
            />
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold">{active.title}</h2>
          {active.subtitle ? <p className="mt-1 text-muted-foreground">{active.subtitle}</p> : null}

          {active.attributes && active.attributes.length ? (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {active.attributes.map(
                (attr, i) =>
                  attr && (
                    <div key={i}>
                      <dt className="text-muted-foreground">{attr.name}</dt>
                      <dd className="font-medium">{attr.value}</dd>
                    </div>
                  )
              )}
            </dl>
          ) : null}

          {active.body ? (
            <div className="prose prose-sm mt-4 max-w-none text-muted-foreground">
              <TinaMarkdown content={active.body} />
            </div>
          ) : null}

          {active.attachmentPdf ? (
            <a
              href={active.attachmentPdf}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-accent underline hover:no-underline"
            >
              {dict.downloadPdf}
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label={dict.prevAria}
          onClick={() => goTo(activeIndex - 1)}
          className="rounded-full bg-surface-muted px-3 py-1.5 text-sm hover:bg-accent-soft"
        >
          {dict.prev}
        </button>
        <div className="flex items-center gap-2">
          {cards.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={dict.goToCard(i + 1)}
              onClick={() => goTo(i)}
              className={`h-2 w-2 rounded-full ${
                i === activeIndex ? "bg-accent" : "bg-border hover:bg-accent-soft"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label={dict.nextAria}
          onClick={() => goTo(activeIndex + 1)}
          className="rounded-full bg-surface-muted px-3 py-1.5 text-sm hover:bg-accent-soft"
        >
          {dict.next}
        </button>
      </div>
    </div>
  );
}
