import Image from "next/image";

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
}) {
  if (isVideoSrc(src)) {
    return (
      <video
        src={src}
        aria-label={alt}
        data-tina-field={dataTinaField}
        className={className}
        autoPlay={autoPlay}
        muted
        loop
        playsInline
        preload="metadata"
      />
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
        className="object-cover"
      />
    </div>
  );
}
