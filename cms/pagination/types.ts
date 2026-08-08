/** A semantic marker, not the "…" glyph itself — rendering it as "…", "...",
 * or an icon stays a components/ presentation choice. */
export type PageWindowItem = number | "ellipsis";

export type Paginated<T> = {
  items: T[];
  currentPage: number;
  totalPages: number;
};
