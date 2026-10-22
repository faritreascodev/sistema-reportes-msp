import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/server/db";
import { hashPassword, requireAdmin } from "@/lib/server/auth";
import { handle, jsonError } from "@/lib/server/http";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/usuarios/:id - Actualizar datos, estado o restablecer contraseña */
export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return jsonError(404, "Usuario no encontrado");

  const body = await req.json().catch(() => ({}));
  const updateData: Record<string, unknown> = {};

  if (typeof body.active === "boolean") {
    // Evitar que el admin se desactive a sí mismo
    if (user.id === admin.userId && !body.active) {
      return jsonError(400, "No puede desactivar su propia cuenta de administrador");
    }
    updateData.active = body.active;
  }

  if (body.role === "ADMIN" || body.role === "USER") {
    if (user.id === admin.userId && body.role !== "ADMIN") {
      return jsonError(400, "No puede quitarse el rol de administrador a sí mismo");
    }
    updateData.role = body.role;
  }

  if (body.nombre && typeof body.nombre === "string") {
    updateData.nombre = body.nombre.trim().toUpperCase();
  }

  if (body.cargo !== undefined) {
    updateData.cargo = typeof body.cargo === "string" && body.cargo.trim() ? body.cargo.trim().toUpperCase() : null;
  }

  if (body.password && typeof body.password === "string" && body.password.trim().length >= 4) {
    updateData.passwordHash = hashPassword(body.password.trim());
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      cedula: true,
      nombre: true,
      cargo: true,
      role: true,
      active: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ user: updated, message: "Usuario actualizado correctamente" });
});

/** DELETE /api/admin/usuarios/:id - Eliminar usuario y sus reportes asociados */
export const DELETE = handle(async (_req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin();
  const { id } = await params;

  if (id === admin.userId) {
    return jsonError(400, "No puede eliminar su propia cuenta de administrador");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return jsonError(404, "Usuario no encontrado");

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ message: "Usuario eliminado correctamente" });
});
