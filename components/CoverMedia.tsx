"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Tina's `image` field type accepts any file, including video (see
 * Hero.tsx's `slide.video`) — this project reuses `seo.ogImage` and the
 * `gallery`/hero-slide media fields the same way, so cover/gallery media
 * can be an image OR a muted autoplaying video from one field, resolved
 * here by file extension rather than a separate field per media type.
 */
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v"];

export function isVideoSrc(src: string): boolean {
  const clean = src.split(/[?#]/)[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext));
}

export default function CoverMedia({
  src,
  alt,
  className,
  dataTinaField,
  autoPlay = true,
  sizes = "100vw",
  priority = false,
}: {
  src: string;
  /** Required at every call site — also doubles as a video's caption/description. */
  alt: string;
  className?: string;
  dataTinaField?: string;
  autoPlay?: boolean;
  /** Passed straight to next/image's `sizes` — override per call site when the
   * image never renders full-bleed (a grid card, a half-width panel, ...) so
   * the CDN doesn't ship a full-viewport-wide image for a small slot. */
  sizes?: string;
  /** Passed straight to next/image's `priority` for the image branch. For
   * the video branch, `true` skips viewport-gating instead (see below) —
   * both mean the same thing, "this call site is above the fold." */
  priority?: boolean;
}) {
  // <video> has no lazy-loading equivalent to next/image's built-in one,
  // and `preload="metadata"` isn't enough on its own: a muted `autoPlay`
  // video gets buffered by the browser regardless of that hint, so every
  // CoverMedia video on a page — MediaGalleryBlock renders up to 5 full
  // -viewport sections at once — downloaded in full on initial load
  // regardless of scroll position (confirmed live: ~28MB of video
  // transferred on a single homepage load in Lighthouse). Mounting the
  // <video> element itself only once its wrapper actually intersects the
  // viewport is the only way to defer that fetch for real.
  const containerRef = useRef<HTMLDivElement>(null);
  const isVideo = isVideoSrc(src);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(priority);

  useEffect(() => {
    if (!isVideo || priority) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isVideo, priority]);

  if (isVideo) {
    return (
      // `aria-label` lives here, not just on the `<video>` below, so a link/button
      // wrapping this element still has a discernible name before the video mounts
      // (it's gated behind IntersectionObserver — see the comment above). A plain
      // `<div>`'s implicit role is `generic`, which prohibits naming attributes
      // (axe: "aria-prohibited-attr") — `role="img"` makes this element one that
      // actually supports `aria-label` as its accessible name.
      <div ref={containerRef} className={className} role="img" aria-label={alt}>
        {shouldLoadVideo && (
          <video
            src={src}
            data-tina-field={dataTinaField}
            className="h-full w-full object-cover"
            autoPlay={autoPlay}
            muted
            loop
            playsInline
            preload="metadata"
          />
        )}
      </div>
    );
  }

  // next/image's `fill` needs a positioned ancestor with real dimensions;
  // Tina's `image` field is a plain string (no stored width/height), and
  // call sites size this box in wildly different ways (grid cards, a
  // full-bleed hero panel, a half-width form panel), so `fill` inside a
  // wrapper carrying the caller's own sizing className is the one approach
  // that works everywhere without every call site also passing pixel
  // dimensions.
  return (
    <div className={`relative overflow-hidden ${className || ""}`}>
      <Image
        src={src}
        alt={alt}
        data-tina-field={dataTinaField}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
