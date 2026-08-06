import type { Template } from "tinacms";

export const heroTemplate: Template = {
  name: "hero",
  label: "Hero",
  fields: [
    { type: "string", name: "heading", label: "Heading", required: true },
    { type: "string", name: "subheading", label: "Subheading" },
    { type: "image", name: "image", label: "Image" },
  ],
};
