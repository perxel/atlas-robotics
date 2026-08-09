import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksFeatureGrid } from "@/tina/__generated__/types";

export default function FeatureGrid({ data }: { data: PagesBlocksFeatureGrid }) {
  const items = (data.items ?? []).filter((item): item is NonNullable<typeof item> => !!item);

  return (
    <section className="mx-auto my-container px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 data-tina-field={tinaField(data, "heading")} className="text-2xl font-semibold">
          {data.heading}
        </h2>
        {data.subheading && (
          <p
            data-tina-field={tinaField(data, "subheading")}
            className="mt-3 text-muted-foreground"
          >
            {data.subheading}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div key={i} data-tina-field={tinaField(item)} className="text-center sm:text-left">
              {item.icon && <div className="text-3xl">{item.icon}</div>}
              <h3 className="mt-3 font-semibold">{item.title}</h3>
              {item.description && (
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
