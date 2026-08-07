import type { Template } from "tinacms";

// No `heading` field: the page's own title (rendered by PageView above the
// blocks) already covers that for a page like Contact, and a `heading`
// field here would collide at the GraphQL level with the required
// `heading` other block templates declare — Tina's query builder merges
// same-named fields across sibling block types and errors on a
// nullability mismatch: "Fields \"heading\" conflict because they return
// conflicting types \"String!\" and \"String\"" (confirmed by hitting that
// error directly). `subheading` is optional on every other block that has
// it too, so it's safe.
//
// name/email/message/submitLabel are all optional per-instance overrides —
// components/blocks/ContactForm.tsx falls back to lib/dictionary.ts (the
// UI-chrome translation) whenever one isn't set, so an editor only needs
// to touch these if a specific page's form should say something different
// from the site default.
export const contactFormTemplate: Template = {
  name: "contactForm",
  label: "Contact Form",
  fields: [
    {
      type: "string",
      name: "subheading",
      label: "Note",
      description: "Optional short note shown above the form.",
    },
    {
      type: "object",
      name: "name",
      label: "Name Field",
      description: "Leave blank to use the site default label/placeholder.",
      fields: [
        { type: "string", name: "label", label: "Label" },
        { type: "string", name: "placeholder", label: "Placeholder" },
      ],
    },
    {
      type: "object",
      name: "email",
      label: "Email Field",
      description: "Leave blank to use the site default label/placeholder.",
      fields: [
        { type: "string", name: "label", label: "Label" },
        { type: "string", name: "placeholder", label: "Placeholder" },
      ],
    },
    {
      type: "object",
      name: "message",
      label: "Message Field",
      description: "Leave blank to use the site default label/placeholder.",
      fields: [
        { type: "string", name: "label", label: "Label" },
        { type: "string", name: "placeholder", label: "Placeholder" },
      ],
    },
    {
      type: "string",
      name: "submitLabel",
      label: "Submit Button Label",
      description: "Leave blank to use the site default.",
    },
  ],
};
