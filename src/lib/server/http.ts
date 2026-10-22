import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { safeFileName } from "../defaults";
import { AuthError } from "./auth";
import { NotFoundError } from "./reports";
import { CertificateError } from "./signing/p12";

export function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/** Envuelve un handler y traduce errores conocidos a respuestas HTTP. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof AuthError) return jsonError(e.status, e.message);
      if (e instanceof ZodError) return jsonError(400, "Datos inválidos", e.issues);
      if (e instanceof NotFoundError) return jsonError(404, e.message);
      if (e instanceof CertificateError) return jsonError(400, e.message);
      console.error(e);
      return jsonError(500, e instanceof Error ? e.message : "Error interno");
    }
  };
}

export function fileResponse(data: Buffer, fileName: string, mime: string, extraHeaders: Record<string, string> = {}) {
  const name = safeFileName(fileName);
  const ascii = name.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/"/g, "");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(data.length),
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export const MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
