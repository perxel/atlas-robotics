import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksCta } from "@/tina/__generated__/types";

export default function Cta({ data }: { data: PagesBlocksCta }) {
  return (
    <section className="my-container text-center">
      <h2 data-tina-field={tinaField(data, "heading")} className="text-2xl font-semibold">
        {data.heading}
      </h2>
      {data.buttonLabel && data.buttonUrl && (
        <a
          href={data.buttonUrl}
          data-tina-field={tinaField(data, "buttonLabel")}
          className="mt-6 inline-block rounded bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          {data.buttonLabel}
        </a>
      )}
    </section>
  );
}
