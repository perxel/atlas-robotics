import type { SortSpec } from "../types";

export function sortItems<T>(items: T[], sort?: SortSpec<T>): T[] {
  if (!sort) return items;
  if (typeof sort === "function") return [...items].sort(sort);

  const { field, direction = "asc", type = "string" } = sort;
  const dir = direction === "desc" ? -1 : 1;

  return [...items].sort((a, b) => {
    const av = a[field];
    const bv = b[field];

    if (type === "date") {
      const at = av ? new Date(av as unknown as string).getTime() : 0;
      const bt = bv ? new Date(bv as unknown as string).getTime() : 0;
      return (at - bt) * dir;
    }
    if (type === "number") {
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    }
    return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
  });
}
