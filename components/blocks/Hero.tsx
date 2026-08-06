import type { PagesBlocksHero } from "@/tina/__generated__/types";

export default function Hero({ data }: { data: PagesBlocksHero }) {
  return (
    <section className="border-b border-border bg-surface-muted px-4 py-16 text-center">
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          className="mx-auto mb-6 h-40 w-40 rounded-full object-cover"
        />
      )}
      <h2 className="text-3xl font-semibold">{data.heading}</h2>
      {data.subheading && <p className="mt-3 text-muted-foreground">{data.subheading}</p>}
    </section>
  );
}
