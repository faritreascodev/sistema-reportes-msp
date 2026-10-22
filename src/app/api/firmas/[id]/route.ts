import type { NextRequest } from "next/server";
import { prisma } from "@/lib/server/db";
import { fileResponse, handle, MIME } from "@/lib/server/http";
import { NotFoundError } from "@/lib/server/reports";
import { verifyPdfSignatures } from "@/lib/server/signing/verify";
import { readStorage } from "@/lib/server/storage";

export const runtime = "nodejs";

/** GET /api/firmas/:id -> PDF firmado.  ?verificar=1 -> resultado de la verificación criptográfica. */
export const GET = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const sig = await prisma.signature.findUnique({ where: { id }, include: { report: { select: { fileName: true } } } });
  if (!sig) throw new NotFoundError("Firma");
  const pdf = await readStorage(sig.pdfPath);
  if (req.nextUrl.searchParams.get("verificar")) {
    return Response.json({ signatures: verifyPdfSignatures(pdf) });
  }
  return fileResponse(pdf, `${sig.report.fileName}-signed.pdf`, MIME.pdf);
});
