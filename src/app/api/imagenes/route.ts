import { NextResponse, type NextRequest } from "next/server";
import { handle, jsonError } from "@/lib/server/http";
import { MAX_UPLOAD_BYTES, storeImage } from "@/lib/server/images";

export const runtime = "nodejs";

/** POST multipart: file, sourceId? (si es un recorte), quality? (40-95), maxSize? (px) */
export const POST = handle(async (req: NextRequest) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "Adjunte una imagen");
  if (file.size > MAX_UPLOAD_BYTES) return jsonError(413, "La imagen supera los 20 MB");
  const num = (k: string) => {
    const v = Number(form.get(k));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  try {
    const stored = await storeImage(Buffer.from(await file.arrayBuffer()), {
      mime: file.type || undefined,
      originalName: file.name,
      sourceId: (form.get("sourceId") as string | null) || null,
      quality: num("quality"),
      maxSize: num("maxSize"),
    });
    return NextResponse.json(stored, { status: 201 });
  } catch (e) {
    return jsonError(400, e instanceof Error ? e.message : "Imagen inválida");
  }
});
