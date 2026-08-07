import { NextRequest, NextResponse } from "next/server";

// No real ESP/mailing-list integration in this PoC — log server side is sufficient.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || typeof body.email !== "string") {
    return NextResponse.json({ ok: false, error: "Invalid submission" }, { status: 400 });
  }

  console.log("[newsletter] signup received:", JSON.stringify(body));

  return NextResponse.json({ ok: true });
}
