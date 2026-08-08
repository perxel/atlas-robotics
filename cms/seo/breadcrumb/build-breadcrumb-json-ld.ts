import type { BreadcrumbItem } from "./types";

/** schema.org BreadcrumbList structured data — the same trail array that
 * feeds the UI list (components/Breadcrumb.tsx), just serialized for
 * search engines instead of rendered. */
export function buildBreadcrumbJsonLd(trail: BreadcrumbItem[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  };
}
