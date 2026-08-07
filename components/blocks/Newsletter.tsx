import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksNewsletter } from "@/tina/__generated__/types";
import type { Locale } from "@/lib/i18n";
import NewsletterForm from "./NewsletterForm";

export default function Newsletter({
  data,
  locale,
}: {
  data: PagesBlocksNewsletter;
  locale: Locale;
}) {
  return (
    <section className="border-t border-border bg-surface-muted px-4 py-16 text-center">
      <h2 data-tina-field={tinaField(data, "heading")} className="text-2xl font-semibold">
        {data.heading}
      </h2>
      {data.subheading && (
        <p
          data-tina-field={tinaField(data, "subheading")}
          className="mx-auto mt-3 max-w-xl text-muted-foreground"
        >
          {data.subheading}
        </p>
      )}
      <div className="mt-8">
        <NewsletterForm locale={locale} />
      </div>
    </section>
  );
}
