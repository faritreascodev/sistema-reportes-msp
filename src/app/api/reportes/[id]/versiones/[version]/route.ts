import { NextResponse, type NextRequest } from "next/server";
import { handle, jsonError } from "@/lib/server/http";
import { getVersion } from "@/lib/server/reports";

export const runtime = "nodejs";

export const GET = handle(async (_req: NextRequest, { params }: { params: Promise<{ id: string; version: string }> }) => {
  const { id, version } = await params;
  const v = Number(version);
  if (!Number.isInteger(v) || v < 1) return jsonError(400, "Versión inválida");
  return NextResponse.json({ version: v, data: await getVersion(id, v) });
});
