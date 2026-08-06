import type { Template } from "tinacms";

export const richTextTemplate: Template = {
  name: "richText",
  label: "Rich Text",
  fields: [{ type: "rich-text", name: "body", label: "Body" }],
};
