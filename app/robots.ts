import type {MetadataRoute} from "next";
import {siteUrl} from "@/cms/seo";

// Next.js's robots.ts file convention renders this at the physical /robots.txt
// URL, same as sitemap.ts renders /sitemap.xml — no route file/middleware
// change needed since middleware.ts's matcher already excludes any path with
// a dot (".*\\..*"), which includes "/robots.txt".
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
