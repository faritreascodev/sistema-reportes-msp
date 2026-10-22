import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/server/db";
import { hashPassword, requireAdmin } from "@/lib/server/auth";
import { handle, jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

/** GET /api/admin/usuarios: Lista todos los usuarios registrados con su conteo de reportes */
export const GET = handle(async () => {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      cedula: true,
      nombre: true,
      cargo: true,
      role: true,
      active: true,
      createdAt: true,
      _count: {
        select: { reports: true },
      },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      cedula: u.cedula,
      nombre: u.nombre,
      cargo: u.cargo,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt.toISOString(),
      reportsCount: u._count.reports,
    })),
  });
});

/** POST /api/admin/usuarios: Crea un nuevo usuario */
export const POST = handle(async (req: NextRequest) => {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const cedula = String(body.cedula ?? "").trim();
  const nombre = String(body.nombre ?? "").trim().toUpperCase();
  const cargo = String(body.cargo ?? "").trim().toUpperCase() || null;
  const password = String(body.password ?? "").trim();
  const role = body.role === "ADMIN" ? "ADMIN" : "USER";

  if (!cedula || !nombre || !password) {
    return jsonError(400, "Cédula, nombre y contraseña son campos obligatorios");
  }

  const existing = await prisma.user.findUnique({ where: { cedula } });
  if (existing) {
    return jsonError(409, `Ya existe un usuario registrado con la cédula ${cedula}`);
  }

  const user = await prisma.user.create({
    data: {
      cedula,
      nombre,
      cargo,
      passwordHash: hashPassword(password),
      role,
      active: true,
    },
    select: {
      id: true,
      cedula: true,
      nombre: true,
      cargo: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user, message: "Usuario creado exitosamente" }, { status: 201 });
});
