import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/server/auth";
import { handle } from "@/lib/server/http";

export const runtime = "nodejs";

export const POST = handle(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
});
