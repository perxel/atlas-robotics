export type SwitcherConfigItem = {
  locale?: string | null;
  label?: string | null;
  flag?: string | null;
} | null;

export type SwitcherEntry<TLocale extends string> = {
  locale: TLocale;
  label: string;
  flag?: string | null;
  href: string;
  isCurrent: boolean;
};

export type DictionaryEntry = {
  key: string;
  values: Record<string, string | null | undefined>;
};

export type CollectionCoverage<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  countsByLocale: Record<TLocale, number>;
  coveragePercentByLocale: Record<TLocale, number>;
};
