import type { NextRequest } from "next/server";
import { exportDocx, exportPdf } from "@/lib/server/documents";
import { fileResponse, handle, jsonError, MIME } from "@/lib/server/http";
import { reportDataSchema } from "@/lib/report-types";

export const runtime = "nodejs";

/** POST /api/exportar/docx|pdf con { data }: exporta lo que hay en el editor sin necesidad de guardar. */
export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ formato: string }> }) => {
  const { formato } = await params;
  const body = await req.json();
  const data = reportDataSchema.parse(body.data ?? body);
  if (formato === "docx") return fileResponse(await exportDocx(data), `${data.fileName}.docx`, MIME.docx);
  if (formato === "pdf") return fileResponse(await exportPdf(data), `${data.fileName}.pdf`, MIME.pdf);
  return jsonError(404, "Formato no soportado");
});
