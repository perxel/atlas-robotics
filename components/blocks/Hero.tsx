"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksHero } from "@/tina/__generated__/types";
import { mediaUrl } from "@/cms/media-url";

const AUTOPLAY_MS = 6000;

export default function Hero({ data }: { data: PagesBlocksHero }) {
  const slides = (data.slides ?? []).filter((s): s is NonNullable<typeof s> => !!s);
  const [index, setIndex] = useState(0);

  // Re-arms on every index change, whether that change came from autoplay
  // or a manual click — so clicking a dot/arrow doesn't get immediately
  // undone by a timer that was already mid-flight.
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [index, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section className="relative isolate min-h-[85vh] w-full overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={i}
          data-tina-field={tinaField(slide)}
          aria-hidden={i !== index}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === index ? "z-10 opacity-100" : "z-0 opacity-0 pointer-events-none"
          }`}
        >
          {slide.video ? (
            <video
              src={mediaUrl(slide.video)}
              poster={mediaUrl(slide.image) || undefined}
              data-tina-field={tinaField(slide, "video")}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              preload={i === 0 ? "auto" : "none"}
              {...({ fetchPriority: i === 0 ? "high" : "low" } as Record<string, string>)}
            />
          ) : (
            slide.image && (
              // Not mediaUrl() — see CoverMedia.tsx's comment: next/image's
              // optimizer fetches this src itself via a Worker-self-fetch
              // through the Images binding, which is what broke production.
              <Image
                src={slide.image}
                alt={slide.imageAlt || ""}
                data-tina-field={tinaField(slide, "image")}
                fill
                sizes="100vw"
                priority={i === 0}
                className="object-cover"
              />
            )
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/10" />

          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
            <h2
              data-tina-field={tinaField(slide, "heading")}
              className="max-w-3xl text-4xl font-semibold text-balance sm:text-5xl"
            >
              {slide.heading}
            </h2>
            {slide.subheading && (
              <p
                data-tina-field={tinaField(slide, "subheading")}
                className="mt-4 max-w-2xl text-lg text-white/90"
              >
                {slide.subheading}
              </p>
            )}
            {slide.buttonLabel && slide.buttonUrl && (
              <a
                href={slide.buttonUrl}
                data-tina-field={tinaField(slide, "buttonLabel")}
                className="mt-8 inline-block rounded bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                {slide.buttonLabel}
              </a>
            )}
          </div>
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute top-1/2 left-4 z-20 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            className="absolute top-1/2 right-4 z-20 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className="group flex h-6 w-6 items-center justify-center"
              >
                <span
                  className={`h-2 w-2 rounded-full transition ${
                    i === index ? "bg-white" : "bg-white/40 group-hover:bg-white/70"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
