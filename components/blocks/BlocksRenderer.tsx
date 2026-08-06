import { tinaField } from "tinacms/dist/react";
import type { PagesBlocks } from "@/tina/__generated__/types";
import Hero from "./Hero";
import RichTextBlock from "./RichTextBlock";
import Cta from "./Cta";

// Add a new block: create <Name>.template.tsx next to its render component
// (see Hero.template.tsx), add it to `pageBlocks` in
// tina/collections/pages.schema.tsx, then a case here mapping its
// __typename to the render component. Each block is wrapped with
// tinaField(block) (no field name = "edit this whole block") so it's
// click-to-edit in Tina's admin preview — a no-op outside that context,
// since tinaField() returns "" when the object has no live-edit metadata.
export default function BlocksRenderer({ blocks }: { blocks: (PagesBlocks | null)[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (!block) return null;
        return (
          <div key={i} data-tina-field={tinaField(block)}>
            {block.__typename === "PagesBlocksHero" && <Hero data={block} />}
            {block.__typename === "PagesBlocksRichText" && <RichTextBlock data={block} />}
            {block.__typename === "PagesBlocksCta" && <Cta data={block} />}
          </div>
        );
      })}
    </>
  );
}
