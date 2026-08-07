import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksHero } from "@/tina/__generated__/types";

export default function Hero({ data }: { data: PagesBlocksHero }) {
  return (
    <section className="border-b border-border bg-surface-muted px-4 py-16 text-center">
      <h2 data-tina-field={tinaField(data, "heading")} className="text-4xl font-semibold">
        {data.heading}
      </h2>
      {data.subheading && (
        <p
          data-tina-field={tinaField(data, "subheading")}
          className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
        >
          {data.subheading}
        </p>
      )}
      {data.buttonLabel && data.buttonUrl && (
        <a
          href={data.buttonUrl}
          data-tina-field={tinaField(data, "buttonLabel")}
          className="mt-8 inline-block rounded bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          {data.buttonLabel}
        </a>
      )}
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          data-tina-field={tinaField(data, "image")}
          className="mx-auto mt-10 aspect-video w-full max-w-3xl rounded-lg object-cover"
        />
      )}
    </section>
  );
}
