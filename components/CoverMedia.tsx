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
}: {
  src: string;
  /** Required at every call site — also doubles as a video's caption/description. */
  alt: string;
  className?: string;
  dataTinaField?: string;
  autoPlay?: boolean;
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

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-tina-field={dataTinaField} className={className} />
  );
}
