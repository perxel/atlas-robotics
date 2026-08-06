import type { Metadata } from "next";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getStoryCards, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
import StoryCardsViewer from "@/components/story-cards/StoryCardsViewer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, "/story-cards");
  const [cards, settings] = await Promise.all([getStoryCards(locale), getSiteSettings(locale)]);
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    seo: cards[0]?.seo,
    fallbackTitle: `${dict.storyCards.pageTitle} — ${settings?.title || dict.siteName}`,
  });
}

export default async function StoryCardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const cards = await getStoryCards(locale);
  const dict = getDictionary(locale);

  const items = cards.map((card) => ({
    id: card.id,
    title: card.title,
    subtitle: card.subtitle,
    primaryImage: card.primaryImage,
    secondaryImage: card.secondaryImage,
    attachmentPdf: card.attachmentPdf,
    attributes: card.attributes,
    body: card.body,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{dict.storyCards.pageTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{dict.storyCards.pageDescription}</p>

      <div className="mt-8">
        <StoryCardsViewer cards={items} locale={locale} />
      </div>
    </div>
  );
}
