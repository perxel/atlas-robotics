import { tinaField } from "tinacms/dist/react";
import CoverMedia from "@/components/CoverMedia";

type GalleryItem = {
  media?: string | null;
  caption?: string | null;
  orientation?: string | null;
} | null;

/**
 * Captioned media grid for the `gallery` field (products/blog detail
 * pages). Caption is always visible below the tile (not a hover overlay)
 * so it works as a real, accessible caption for video items too, not just
 * decorative alt text — matches this section's "every video needs a
 * caption" requirement. Portrait items use a taller `aspect-[3/4]` box
 * instead of being cropped to the same landscape frame as everything else.
 */
export default function MediaGrid({ items, heading }: { items: GalleryItem[]; heading: string }) {
  const shown = items.filter((item): item is NonNullable<GalleryItem> => !!item?.media && !!item?.caption);
  if (shown.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold">{heading}</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
        {shown.map((item, i) => (
          <figure key={i} data-tina-field={tinaField(item)}>
            <div
              className={`overflow-hidden rounded-lg bg-surface-muted ${
                item.orientation === "portrait" ? "aspect-[3/4]" : "aspect-[4/3]"
              }`}
            >
              <CoverMedia
                src={item.media!}
                alt={item.caption!}
                dataTinaField={tinaField(item, "media")}
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption
              data-tina-field={tinaField(item, "caption")}
              className="mt-2 text-xs text-muted-foreground italic"
            >
              {item.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
