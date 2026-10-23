import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/server/db";
import { requireAuth, hashPassword, verifyPassword } from "@/lib/server/auth";
import { handle, jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

// Obtener información del perfil del usuario actual
export const GET = handle(async () => {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
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

  if (!user) {
    return jsonError(404, "Usuario no encontrado");
  }

  return NextResponse.json({
    user: {
      id: user.id,
      cedula: user.cedula,
      nombre: user.nombre,
      cargo: user.cargo,
      role: user.role,
      createdAt: user.createdAt,
      reportsCount: user._count.reports,
    },
  });
});

// Actualizar nombre, cargo o contraseña del usuario actual
export const PATCH = handle(async (req: NextRequest) => {
  const session = await requireAuth();
  const body = await req.json().catch(() => ({}));

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return jsonError(404, "Usuario no encontrado");

  const dataToUpdate: { nombre?: string; cargo?: string; passwordHash?: string } = {};

  if (typeof body.nombre === "string" && body.nombre.trim().length >= 3) {
    dataToUpdate.nombre = body.nombre.trim().toUpperCase();
  }

  if (typeof body.cargo === "string") {
    dataToUpdate.cargo = body.cargo.trim().toUpperCase() || null;
  }

  // Si desea cambiar la contraseña
  if (body.newPassword) {
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "").trim();

    if (newPassword.length < 4) {
      return jsonError(400, "La nueva contraseña debe tener al menos 4 caracteres");
    }

    // Verificar la contraseña anterior
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return jsonError(400, "La contraseña actual es incorrecta");
    }

    dataToUpdate.passwordHash = hashPassword(newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: dataToUpdate,
    select: {
      id: true,
      cedula: true,
      nombre: true,
      cargo: true,
      role: true,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
});
