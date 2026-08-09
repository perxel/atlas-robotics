/** Stable sort of `names` per `order` — names not listed in `order` sort
 * after every listed name, in their original relative order. Omit `order`
 * to return `names` untouched. Shared by SeoDashboardService and
 * TranslationDashboardService so their row order stays in sync when a
 * project sets a dashboard row order — previously each had its own copy,
 * and only one of the two ever got updated when this logic changed. */
export function sortByOrder<T>(names: T[], order: readonly T[] | undefined): T[] {
  if (!order) return names;
  const rank = new Map(order.map((name, i) => [name, i]));
  return [...names].sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity));
}
