import type { Edge } from "../types";

/** Directory-based localization: content/<collection>/<locale>/<file>. */
export function inLocale<T extends { _sys: { breadcrumbs: string[] } }>(
  edges: Array<Edge<T>> | null | undefined,
  locale: string
): T[] {
  return (edges || [])
    .map((edge) => edge?.node)
    .filter((node): node is T => !!node && node._sys.breadcrumbs[0] === locale);
}
