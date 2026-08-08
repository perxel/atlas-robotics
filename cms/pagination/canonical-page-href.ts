/** `basePath` for page 1, `basePath/page/N` for every other page — the one place this URL shape is spelled out. */
export function canonicalPageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/page/${page}`;
}
