import type { NextRequest } from "next/server";
import { signReport } from "@/lib/server/documents";
import { fileResponse, handle, jsonError, MIME } from "@/lib/server/http";

export const runtime = "nodejs";

const MAX_CERT_BYTES = 64 * 1024;

/**
 * POST multipart: certificado (.p12/.pfx), password, responsable (índice), version?, subFilter?
 * El certificado y la contraseña sólo viven en memoria durante la petición: no se guardan ni se registran.
 */
export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("certificado");
  const password = form.get("password");
  if (!(file instanceof File) || typeof password !== "string") return jsonError(400, "Adjunte el certificado .p12/.pfx y su contraseña");
  if (file.size === 0 || file.size > MAX_CERT_BYTES) return jsonError(400, "El archivo de certificado no es válido");

  const result = await signReport({
    reportId: id,
    version: (form.get("version") as string | null) || null,
    certificate: Buffer.from(await file.arrayBuffer()),
    password,
    responsableIndex: Number(form.get("responsable") ?? 0) || 0,
    subFilter: (form.get("subFilter") as string | null) ?? undefined,
  });
  return fileResponse(result.pdf, result.fileName, MIME.pdf, {
    "X-Signature-Id": result.id,
    "X-Signer-Name": encodeURIComponent(result.info.commonName),
  });
});
