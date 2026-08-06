import { StaticTinaMarkdown } from "tinacms/dist/rich-text/static";
import type { PagesBlocksRichText } from "@/tina/__generated__/types";

export default function RichTextBlock({ data }: { data: PagesBlocksRichText }) {
  if (!data.body) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="prose prose-sm max-w-none">
        <StaticTinaMarkdown content={data.body} />
      </div>
    </section>
  );
}
