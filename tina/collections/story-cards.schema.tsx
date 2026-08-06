import type { Collection } from "tinacms";
import { draftField } from "./shared-fields/draft.schema";
import { seoField } from "./shared-fields/seo.schema";

export const storyCardsCollection: Collection = {
  name: "storyCards",
  label: "Story Cards",
  path: "content/story-cards",
  format: "md",
  fields: [
    { type: "string", name: "title", label: "Title", required: true },
    { type: "string", name: "subtitle", label: "Subtitle" },
    draftField(),
    {
      type: "number",
      name: "sortOrder",
      label: "Sort Order",
      description: "Lower numbers appear first",
    },
    { type: "image", name: "primaryImage", label: "Primary Image" },
    { type: "image", name: "secondaryImage", label: "Secondary Image" },
    {
      type: "image",
      name: "attachmentPdf",
      label: "Attachment (PDF)",
      description:
        "Tina's image field accepts any file type through repo based media, including PDFs.",
    },
    {
      type: "object",
      name: "attributes",
      label: "Attributes",
      list: true,
      ui: {
        itemProps: (item) => ({ label: item?.name || "Attribute" }),
      },
      fields: [
        { type: "string", name: "name", label: "Name" },
        { type: "string", name: "value", label: "Value" },
      ],
    },
    {
      type: "rich-text",
      name: "body",
      label: "Body Copy",
      isBody: true,
    },
    seoField(),
  ],
};
