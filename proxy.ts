import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, pathnameHasLocalePrefix } from "@/lib/i18n";

// Locale routing strategy: the default locale is served unprefixed at "/"
// (internally rewritten to the "/<defaultLocale>" route segment), every
// other locale is served under its own "/<locale>" prefix. An explicit
// "/<defaultLocale>" URL is canonicalized (redirected) back to the
// unprefixed form so there is only ever one URL per page.
export function proxy(request: NextRequest) {
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
  matcher: ["/((?!_next|api|admin|favicon.ico|.*\\..*).*)"],
};
