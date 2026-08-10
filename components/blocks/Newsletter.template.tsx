import type { Template } from "tinacms";

export const newsletterTemplate: Template = {
  name: "newsletter",
  label: "Newsletter Signup",
  fields: [
    { type: "string", name: "heading", label: "Heading" },
    { type: "string", name: "subheading", label: "Subheading" },
    // Optional per-instance overrides — components/blocks/Newsletter.tsx
    // resolves the site default (the CMS-editable translation dictionary,
    // cms/multilingual) whenever one isn't set.
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
      type: "string",
      name: "submitLabel",
      label: "Submit Button Label",
      description: "Leave blank to use the site default.",
    },
  ],
};
