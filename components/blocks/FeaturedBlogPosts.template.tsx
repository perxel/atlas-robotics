import type { Template } from "tinacms";

export const featuredBlogPostsTemplate: Template = {
  name: "featuredBlogPosts",
  label: "Featured Blog Posts",
  fields: [
    { type: "string", name: "heading", label: "Heading", required: true },
    { type: "string", name: "subheading", label: "Subheading" },
    {
      type: "number",
      name: "postsToShow",
      label: "Number of Posts to Show",
      description: "Shows the most recently published posts. Defaults to 3.",
    },
  ],
};
