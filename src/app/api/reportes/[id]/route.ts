import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/server/auth";
import { handle } from "@/lib/server/http";
import { deleteReport, getReport, listSignatures, listVersions, saveReport } from "@/lib/server/reports";
import { saveRequestSchema } from "@/lib/report-types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: NextRequest, { params }: Ctx) => {
  const session = await getSession();
  const filterUserId = session && session.role !== "ADMIN" ? session.userId : undefined;
  const { id } = await params;
  const [report, versions, signatures] = await Promise.all([getReport(id, filterUserId), listVersions(id), listSignatures(id)]);
  return NextResponse.json({ ...report, versions, signatures });
});

/** PUT { data, mode: "overwrite" | "new-version", note? } */
export const PUT = handle(async (req: NextRequest, { params }: Ctx) => {
  const session = await getSession();
  const filterUserId = session && session.role !== "ADMIN" ? session.userId : undefined;
  const { id } = await params;
  const { data, mode, note } = saveRequestSchema.parse(await req.json());
  const report = await saveReport(id, data, mode, filterUserId, note);
  const [versions, signatures] = await Promise.all([listVersions(id), listSignatures(id)]);
  return NextResponse.json({ ...report, versions, signatures });
});

export const DELETE = handle(async (_req: NextRequest, { params }: Ctx) => {
  const session = await getSession();
  const filterUserId = session && session.role !== "ADMIN" ? session.userId : undefined;
  const { id } = await params;
  await deleteReport(id, filterUserId);
  return new Response(null, { status: 204 });
});
