import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { prisma } from "./db";
import { readStorage, writeStorage } from "./storage";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/tiff", "image/bmp"]);

export type StoredImage = { id: string; width: number; height: number; size: number; url: string; sourceId: string | null };

/**
 * Normaliza una imagen subida: corrige la orientación EXIF, limita la resolución y la
 * guarda como JPEG optimizado (mozjpeg). Los PNG/escaneos con transparencia se aplanan en blanco.
 */
export async function storeImage(
  input: Buffer,
  opts: { mime?: string; originalName?: string; sourceId?: string | null; quality?: number; maxSize?: number } = {},
): Promise<StoredImage> {
  if (input.length > MAX_UPLOAD_BYTES) throw new Error("La imagen supera los 20 MB");
  if (opts.mime && !ACCEPTED.has(opts.mime)) throw new Error("Formato de imagen no soportado");
  const quality = Math.min(95, Math.max(40, Math.round(opts.quality ?? 85)));
  const maxSize = Math.min(4000, Math.max(400, Math.round(opts.maxSize ?? 2400)));

  const { data, info } = await sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const id = randomUUID();
  const path = await writeStorage(`images/${id}.jpg`, data);
  await prisma.imageAsset.create({
    data: {
      id, path, mime: "image/jpeg", width: info.width, height: info.height, size: data.length,
      originalName: opts.originalName?.slice(0, 200) ?? null, sourceId: opts.sourceId ?? null,
    },
  });
  return { id, width: info.width, height: info.height, size: data.length, url: `/api/imagenes/${id}`, sourceId: opts.sourceId ?? null };
}

export type LoadedImage = { id: string; data: Buffer; mime: string; width: number; height: number };

export async function loadImages(ids: (string | null | undefined)[]): Promise<Map<string, LoadedImage>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  const assets = await prisma.imageAsset.findMany({ where: { id: { in: unique } } });
  const out = new Map<string, LoadedImage>();
  await Promise.all(
    assets.map(async (a) => {
      out.set(a.id, { id: a.id, data: await readStorage(a.path), mime: a.mime, width: a.width, height: a.height });
    }),
  );
  return out;
}
