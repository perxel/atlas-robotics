import type { Template } from "tinacms";

export const heroTemplate: Template = {
  name: "hero",
  label: "Hero",
  fields: [
    {
      type: "object",
      name: "slides",
      label: "Slides",
      list: true,
      ui: {
        itemProps: (item) => ({ label: item?.heading || "Slide" }),
      },
      fields: [
        { type: "string", name: "heading", label: "Heading", required: true },
        { type: "string", name: "subheading", label: "Subheading" },
        {
          type: "image",
          name: "image",
          label: "Background Image",
          description:
            "Used as the background. If a background video is also set, this shows as its poster frame while the video loads and is what search engines/social previews see.",
        },
        {
          type: "image",
          name: "video",
          label: "Background Video",
          description:
            "Optional. Tina's image field accepts any file type, including video — when set, this plays muted/looped as the slide background instead of the image above.",
        },
        { type: "string", name: "buttonLabel", label: "Button Label" },
        { type: "string", name: "buttonUrl", label: "Button URL" },
      ],
    },
  ],
};
