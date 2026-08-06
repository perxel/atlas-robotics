import type { PagesBlocks } from "@/tina/__generated__/types";
import Hero from "./Hero";
import RichTextBlock from "./RichTextBlock";
import Cta from "./Cta";

// Add a new block: add its Template in tina/blocks.ts, then a case here
// mapping its __typename to a render component.
export default function BlocksRenderer({ blocks }: { blocks: (PagesBlocks | null)[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (!block) return null;
        switch (block.__typename) {
          case "PagesBlocksHero":
            return <Hero key={i} data={block} />;
          case "PagesBlocksRichText":
            return <RichTextBlock key={i} data={block} />;
          case "PagesBlocksCta":
            return <Cta key={i} data={block} />;
          default:
            return null;
        }
      })}
    </>
  );
}
