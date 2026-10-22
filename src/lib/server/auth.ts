import crypto from "node:crypto";
import { cookies } from "next/headers";

export type UserRole = "ADMIN" | "USER";

export type SessionPayload = {
  userId: string;
  cedula: string;
  nombre: string;
  cargo: string | null;
  role: UserRole;
  exp: number;
};

export const SESSION_COOKIE_NAME = "msp_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 días para comodidad de los funcionarios

const AUTH_SECRET = process.env.AUTH_SECRET || "msp-secret-key-farit-reasco-2026-segura-1234567890";

/** Genera un hash seguro para la contraseña con salt y scrypt (estándar criptográfico nativo) */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/** Verifica si la contraseña provista coincide con el hash almacenado */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/** Firma un token de sesión seguro (formato compacto base64url con HMAC-SHA256) */
export function createSessionToken(user: { id: string; cedula: string; nombre: string; cargo?: string | null; role: string }): string {
  const payload: SessionPayload = {
    userId: user.id,
    cedula: user.cedula,
    nombre: user.nombre,
    cargo: user.cargo ?? null,
    role: (user.role === "ADMIN" ? "ADMIN" : "USER") as UserRole,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Valida el token y devuelve el contenido de la sesión */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expectedSig = crypto.createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null; // Expirado
    return payload;
  } catch {
    return null;
  }
}

/** Obtiene la sesión actual desde las cookies en Server Components / Route Handlers */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Exige autenticación; lanza error 401 si no hay sesión válida */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Sesión no iniciada o expirada", 401);
  }
  return session;
}

/** Exige rol de administrador; lanza error 403 si el usuario no es ADMIN */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== "ADMIN") {
    throw new AuthError("Acceso denegado: se requieren privilegios de administrador", 403);
  }
  return session;
}

export class AuthError extends Error {
  constructor(message: string, public readonly status: number = 401) {
    super(message);
    this.name = "AuthError";
  }
}
