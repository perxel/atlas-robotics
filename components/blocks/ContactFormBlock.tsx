import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksContactForm } from "@/tina/__generated__/types";
import type { Locale } from "@/lib/i18n";
import ContactForm from "./ContactForm";

export default function ContactFormBlock({
  data,
  locale,
}: {
  data: PagesBlocksContactForm;
  locale: Locale;
}) {
  return (
    <section className="mx-auto max-w-xl px-4 py-12">
      {data.subheading && (
        <p
          data-tina-field={tinaField(data, "subheading")}
          className="mb-6 text-sm text-muted-foreground"
        >
          {data.subheading}
        </p>
      )}
      <ContactForm locale={locale} fields={data} />
    </section>
  );
}
