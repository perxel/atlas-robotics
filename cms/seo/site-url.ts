import { requireInProduction } from "./require-in-production";

/**
 * cms/seo's own env-var contract for the site's canonical public URL — every
 * canonical/hreflang/sitemap URL SeoService builds comes from this value.
 * Not project data (unlike a collection name or locale segment): the name
 * `NEXT_PUBLIC_SITE_URL` is this framework's own convention, the same way
 * `NEXT_PUBLIC_TINA_CLIENT_ID`/`TINA_TOKEN` are Tina's (see tina/config.ts,
 * which reads those directly with no project-layer indirection either).
 * Read as a static `process.env.NEXT_PUBLIC_SITE_URL` literal rather than
 * behind a parameterized helper — see requireInProduction's own comment for
 * why a dynamic env lookup would silently break in the client bundle.
 */
export const siteUrl = requireInProduction(process.env.NEXT_PUBLIC_SITE_URL, {
  fallback: "http://localhost:3000",
  errorMessage:
    "NEXT_PUBLIC_SITE_URL is not set. Canonical/hreflang/sitemap URLs would all " +
    "silently resolve to http://localhost:3000 in production otherwise — see " +
    "CLAUDE.md's \"Production builds require Tina Cloud\" note.",
});
