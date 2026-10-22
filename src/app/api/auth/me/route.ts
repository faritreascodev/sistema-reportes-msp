import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { handle } from "@/lib/server/http";

export const runtime = "nodejs";

export const GET = handle(async () => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      cedula: session.cedula,
      nombre: session.nombre,
      cargo: session.cargo,
      role: session.role,
    },
  });
});
