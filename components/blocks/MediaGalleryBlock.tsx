import Link from "next/link";
import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksMediaGallery } from "@/tina/__generated__/types";
import CoverMedia from "@/components/CoverMedia";

export default function MediaGalleryBlock({ data }: { data: PagesBlocksMediaGallery }) {
  const items = (data.items ?? []).filter((item): item is NonNullable<typeof item> => !!item?.media);
  if (items.length === 0) return null;

  return (
    <section>
      {(data.heading || data.subheading) && (
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          {data.heading && (
            <h2 data-tina-field={tinaField(data, "heading")} className="text-2xl font-semibold">
              {data.heading}
            </h2>
          )}
          {data.subheading && (
            <p data-tina-field={tinaField(data, "subheading")} className="mt-3 text-muted-foreground">
              {data.subheading}
            </p>
          )}
        </div>
      )}

      {items.map((item, i) => (
        <div key={i} data-tina-field={tinaField(item)} className="relative h-screen w-full overflow-hidden">
          <CoverMedia
            src={item.media!}
            alt={item.caption || item.heading || ""}
            dataTinaField={tinaField(item, "media")}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />

          <span className="absolute top-8 left-4 font-mono text-xs text-white/70 sm:left-8">
            {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 px-4 pb-16 sm:px-8 sm:pb-20">
            <h3
              data-tina-field={tinaField(item, "heading")}
              className="max-w-3xl text-4xl font-semibold text-balance text-white sm:text-6xl"
            >
              {item.heading}
            </h3>
            {item.subheading && (
              <p
                data-tina-field={tinaField(item, "subheading")}
                className="max-w-xl text-lg text-white/90"
              >
                {item.subheading}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-6">
              {item.buttonLabel && item.buttonUrl && (
                <Link
                  href={item.buttonUrl}
                  data-tina-field={tinaField(item, "buttonLabel")}
                  className="inline-block rounded bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:opacity-90"
                >
                  {item.buttonLabel}
                </Link>
              )}
              {item.caption && (
                <span
                  data-tina-field={tinaField(item, "caption")}
                  className="text-xs text-white/60 italic"
                >
                  {item.caption}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
