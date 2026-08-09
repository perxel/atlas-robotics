import { TinaMarkdown } from "tinacms/dist/rich-text";
import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksRichText } from "@/tina/__generated__/types";

export default function RichTextBlock({ data }: { data: PagesBlocksRichText }) {
  if (!data.body) return null;

  return (
    <section className="my-container py-12">
      <div data-tina-field={tinaField(data, "body")} className="prose prose-sm max-w-none">
        <TinaMarkdown content={data.body} />
      </div>
    </section>
  );
}
