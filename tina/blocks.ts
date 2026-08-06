import type { Template } from "tinacms";

// Example block set for the `pages` collection's block-based editing.
// https://tina.io/docs/editing/blocks
// Add a new block by adding a Template here, a matching case in
// components/blocks/BlocksRenderer.tsx, and a small render component.

export const heroBlock: Template = {
  name: "hero",
  label: "Hero",
  fields: [
    { type: "string", name: "heading", label: "Heading", required: true },
    { type: "string", name: "subheading", label: "Subheading" },
    { type: "image", name: "image", label: "Image" },
  ],
};

export const richTextBlock: Template = {
  name: "richText",
  label: "Rich Text",
  fields: [{ type: "rich-text", name: "body", label: "Body" }],
};

export const ctaBlock: Template = {
  name: "cta",
  label: "Call To Action",
  fields: [
    { type: "string", name: "heading", label: "Heading", required: true },
    { type: "string", name: "buttonLabel", label: "Button Label" },
    { type: "string", name: "buttonUrl", label: "Button URL" },
  ],
};

export const pageBlocks: Template[] = [heroBlock, richTextBlock, ctaBlock];
