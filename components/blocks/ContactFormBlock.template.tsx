import type { Template } from "tinacms";

// No `heading` field: the page's own title (rendered by PageView above the
// blocks) already covers that for a page like Contact. (A `heading` field
// here used to also risk colliding at the GraphQL level — Tina's query
// builder merges same-named fields across sibling block types in the
// `blocks` union and errors on a nullability mismatch:
// "Fields \"heading\" conflict because they return conflicting types
// \"String!\" and \"String\"" [confirmed by hitting that error directly]
// — now moot, see BlocksRenderer.tsx's top comment: every block field is
// optional, so a same-named field never conflicts either way.)
// `subheading` is optional on every other block that has it too, so it's
// safe.
//
// name/email/message/submitLabel are all optional per-instance overrides —
// components/blocks/ContactFormBlock.tsx resolves the site default (the
// CMS-editable translation dictionary, cms/multilingual) whenever one
// isn't set, so an editor only needs to touch these if a specific page's
// form should say something different from the site default.
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
    {
      type: "image",
      name: "media",
      label: "Side Image or Video",
      description:
        "Optional. Shown beside the form (left on desktop, above it on mobile). Tina's image field accepts any file — set a video (.mp4) to autoplay it muted/looped. Leave blank to render the form alone, centered.",
    },
    {
      type: "string",
      name: "mediaAlt",
      label: "Side Image/Video Alt Text",
    },
  ],
};
