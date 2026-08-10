import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksNewsletter } from "@/tina/__generated__/types";
import { translateText } from "@/cms/multilingual";
import NewsletterForm, { type NewsletterFormCopy } from "./NewsletterForm";

export default function Newsletter({
  data,
  uiDictionary,
}: {
  data: PagesBlocksNewsletter;
  uiDictionary: Record<string, string>;
}) {
  const t = (text: string) => translateText(uiDictionary, text);

  // Optional per-instance overrides on the block itself, falling back to
  // the translated site default whenever one isn't set.
  const fields: NewsletterFormCopy = {
    email: {
      label: data.email?.label || t("Email address"),
      placeholder: data.email?.placeholder || t("you@example.com"),
    },
    submitLabel: data.submitLabel || t("Subscribe"),
    sending: t("Subscribing…"),
    success: t("You're in — check your inbox to confirm."),
    error: t("Something went wrong. Please try again."),
  };

  return (
    <section className="border-t border-border bg-surface-muted px-4 py-16 text-center">
      {data.heading && (
        <h2 data-tina-field={tinaField(data, "heading")} className="text-2xl font-semibold">
          {data.heading}
        </h2>
      )}
      {data.subheading && (
        <p
          data-tina-field={tinaField(data, "subheading")}
          className="mx-auto mt-3 max-w-xl text-muted-foreground"
        >
          {data.subheading}
        </p>
      )}
      <div className="mt-8">
        <NewsletterForm fields={fields} />
      </div>
    </section>
  );
}
