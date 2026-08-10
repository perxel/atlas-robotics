import type { Template } from "tinacms";

// No `heading` field — same reasoning as ContactFormBlock.template.tsx:
// the page's own title already covers it. (A `heading` field here used to
// also risk colliding at the GraphQL level with the `heading` other block
// templates declared `required: true` — now moot, see BlocksRenderer.tsx's
// top comment: no block field is required anymore, so adding one here
// wouldn't conflict either way.)
export const blogListingTemplate: Template = {
  name: "blogListing",
  label: "Blog Listing",
  fields: [
    {
      type: "string",
      name: "subheading",
      label: "Note",
      description: "Optional short note shown above the post grid.",
    },
  ],
};
