/**
 * Rate Limiter en memoria para mitigación de ataques de fuerza bruta y DoS.
 * Protege los endpoints críticos como /api/auth/login.
 */

type AttemptRecord = {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
};

const store = new Map<string, AttemptRecord>();

// Limpieza periódica de memoria cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.blockedUntil && record.blockedUntil < now) {
      store.delete(key);
    } else if (now - record.firstAttempt > 30 * 60 * 1000) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000,
  blockDurationMs: number = 15 * 60 * 1000,
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record) {
    store.set(identifier, { count: 1, firstAttempt: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  // Si está actualmente bloqueado
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Si la ventana de tiempo ya expiró, reiniciar conteo
  if (now - record.firstAttempt > windowMs) {
    store.set(identifier, { count: 1, firstAttempt: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  record.count++;

  // Si superó el límite, bloquear
  if (record.count > maxAttempts) {
    record.blockedUntil = now + blockDurationMs;
    const retryAfterSeconds = Math.ceil(blockDurationMs / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  return { allowed: true, remainingAttempts: maxAttempts - record.count };
}

export function resetRateLimit(identifier: string) {
  store.delete(identifier);
}
