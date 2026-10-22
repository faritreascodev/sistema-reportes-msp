import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/server/db";
import { handle } from "@/lib/server/http";
import { NotFoundError } from "@/lib/server/reports";
import { readStorage } from "@/lib/server/storage";

export const runtime = "nodejs";

/** GET /api/imagenes/:id -> la imagen (inmutable).  ?meta=1 -> { id, width, height, size, sourceId } */
export const GET = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const asset = await prisma.imageAsset.findUnique({ where: { id } });
  if (!asset) throw new NotFoundError("Imagen");
  if (req.nextUrl.searchParams.get("meta")) {
    return NextResponse.json({ id: asset.id, width: asset.width, height: asset.height, size: asset.size, sourceId: asset.sourceId });
  }
  const data = await readStorage(asset.path);
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": asset.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
});
