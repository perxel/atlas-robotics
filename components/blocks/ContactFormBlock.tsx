import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksContactForm } from "@/tina/__generated__/types";
import { translateText } from "@/cms/multilingual";
import ContactForm, { type ContactFormCopy } from "./ContactForm";

export default function ContactFormBlock({
  data,
  uiDictionary,
}: {
  data: PagesBlocksContactForm;
  uiDictionary: Record<string, string>;
}) {
  const t = (text: string) => translateText(uiDictionary, text);

  // name/email/message/submitLabel are all optional per-instance overrides
  // on the block itself — falling back to the translated site default
  // whenever one isn't set, so an editor only needs to touch these if a
  // specific page's form should say something different from the default.
  const fields: ContactFormCopy = {
    name: { label: data.name?.label || t("Name"), placeholder: data.name?.placeholder || t("Your name") },
    email: {
      label: data.email?.label || t("Email address"),
      placeholder: data.email?.placeholder || t("you@example.com"),
    },
    message: {
      label: data.message?.label || t("Message"),
      placeholder: data.message?.placeholder || t("How can we help?"),
    },
    submitLabel: data.submitLabel || t("Send"),
    sending: t("Sending…"),
    success: t("Thanks — your message was logged server side."),
    error: t("Something went wrong. Please try again."),
  };

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
      <ContactForm fields={fields} />
    </section>
  );
}
