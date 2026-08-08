import { NextRequest, NextResponse } from "next/server";
import { CMSMultilingual, resolveLocaleAlternates } from "@/lib/cms";

// Backs LanguageSwitcher's client-side refresh — see that component's
// comment for why this can't just be server-computed once in Header.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale");
  const pathname = searchParams.get("pathname");

  if (!pathname || !locale || !CMSMultilingual.isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale or pathname" }, { status: 400 });
  }

  const urls = await resolveLocaleAlternates(locale, pathname);
  return NextResponse.json({ urls });
}
