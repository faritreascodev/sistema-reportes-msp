import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/server/db";
import { createSessionToken, verifyPassword, SESSION_COOKIE_NAME } from "@/lib/server/auth";
import { handle, jsonError } from "@/lib/server/http";
import { checkRateLimit, resetRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export const POST = handle(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const body = await req.json().catch(() => ({}));
  const cedula = String(body.cedula ?? "").trim();
  const password = String(body.password ?? "");

  // Rate limiting por IP y Cédula (máximo 5 intentos cada 15 min)
  const rateLimitKey = `${ip}:${cedula || "anon"}`;
  const rateStatus = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);

  if (!rateStatus.allowed) {
    return jsonError(
      429,
      `Demasiados intentos fallidos. Por seguridad, intente nuevamente en ${Math.ceil((rateStatus.retryAfterSeconds ?? 60) / 60)} minutos.`,
    );
  }

  if (!cedula || !password) {
    return jsonError(400, "Ingrese la cédula y la contraseña");
  }

  const user = await prisma.user.findUnique({ where: { cedula } });
  if (!user) {
    return jsonError(401, "Cédula o contraseña incorrecta");
  }

  if (!user.active) {
    return jsonError(403, "Su cuenta se encuentra inactiva o suspendida. Comuníquese con el administrador.");
  }

  const passwordOk = verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    return jsonError(401, "Cédula o contraseña incorrecta");
  }

  // Éxito: limpiar contador de intentos
  resetRateLimit(rateLimitKey);

  const token = createSessionToken(user);
  const res = NextResponse.json({
    user: {
      id: user.id,
      cedula: user.cedula,
      nombre: user.nombre,
      cargo: user.cargo,
      role: user.role,
    },
  });

  // Cookie segura válida por 30 días
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return res;
});
