import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Verificar conexión a la base de datos
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", error: e instanceof Error ? e.message : "Database unavailable" },
      { status: 503 },
    );
  }
}
