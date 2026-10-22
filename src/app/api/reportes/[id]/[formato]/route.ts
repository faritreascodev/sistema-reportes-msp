import type { NextRequest } from "next/server";
import { exportDocx, exportPdf, resolveReportData } from "@/lib/server/documents";
import { fileResponse, handle, jsonError, MIME } from "@/lib/server/http";

export const runtime = "nodejs";

/** GET /api/reportes/:id/docx | /pdf  (?version=N para una versión histórica) */
export const GET = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string; formato: string }> }) => {
  const { id, formato } = await params;
  if (formato !== "docx" && formato !== "pdf") return jsonError(404, "Formato no soportado");
  const { data } = await resolveReportData(id, req.nextUrl.searchParams.get("version"));
  if (formato === "docx") return fileResponse(await exportDocx(data), `${data.fileName}.docx`, MIME.docx);
  return fileResponse(await exportPdf(data), `${data.fileName}.pdf`, MIME.pdf);
});
