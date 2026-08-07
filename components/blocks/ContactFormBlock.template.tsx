import type { Template } from "tinacms";

// No `heading` field: the page's own title (rendered by PageView above the
// blocks) already covers that for a page like Contact, and a `heading`
// field here would collide at the GraphQL level with the required
// `heading` other block templates declare — Tina's query builder merges
// same-named fields across sibling block types and errors on a
// nullability mismatch: "Fields \"heading\" conflict because they return
// conflicting types \"String!\" and \"String\"" (confirmed by hitting that
// error directly). `subheading` is optional on every other block that has
// it too, so it's safe. GraphQL object types can't have zero fields
// either (confirmed: "Type PagesBlocksContactForm must define one or more
// fields"), so this also can't just be `fields: []`.
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
  ],
};
