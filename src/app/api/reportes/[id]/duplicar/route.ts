import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/server/auth";
import { handle } from "@/lib/server/http";
import { duplicateReport } from "@/lib/server/reports";

export const runtime = "nodejs";

export const POST = handle(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  const { id } = await params;
  return NextResponse.json(await duplicateReport(id, session?.userId), { status: 201 });
});
