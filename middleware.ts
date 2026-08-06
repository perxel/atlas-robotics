import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, pathnameHasLocalePrefix } from "@/lib/i18n";

// Locale routing strategy: the default locale is served unprefixed at "/"
// (internally rewritten to the "/<defaultLocale>" route segment), every
// other locale is served under its own "/<locale>" prefix. An explicit
// "/<defaultLocale>" URL is canonicalized (redirected) back to the
// unprefixed form so there is only ever one URL per page.
//
// This file intentionally uses the deprecated `middleware.ts` convention
// instead of Next.js 16's `proxy.ts`: `proxy.ts` is hardcoded to the
// Node.js runtime with no override (Next.js throws if you try), and
// Cloudflare's opennextjs-cloudflare adapter doesn't support Node.js
// middleware yet (github.com/opennextjs/opennextjs-cloudflare#962,
// long-term tracked in #972). `middleware.ts` still honors an explicit
// edge `runtime` in its `config` export, which this deployment needs.
// Re-evaluate on every Next.js/opennextjs-cloudflare upgrade — this only
// works because `middleware.ts` isn't (yet) subject to the same
// runtime lock-in as `proxy.ts`.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const defaultPrefix = `/${defaultLocale}`;
  if (pathname === defaultPrefix || pathname.startsWith(`${defaultPrefix}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(defaultPrefix.length) || "/";
    return NextResponse.redirect(url, 308);
  }

  const requestHeaders = new Headers(request.headers);
  // Stash the visible (unprefixed-for-default-locale) pathname so server
  // components can build canonical/hreflang links.
  requestHeaders.set("x-pathname", pathname);

  if (pathnameHasLocalePrefix(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = request.nextUrl.clone();
  url.pathname = `${defaultPrefix}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  runtime: "experimental-edge",
  matcher: ["/((?!_next|api|admin|favicon.ico|.*\\..*).*)"],
};
