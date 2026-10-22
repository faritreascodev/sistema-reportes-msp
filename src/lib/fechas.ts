export const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

/** "2026-09-11" -> "11 DE SEPTIEMBRE DE 2026" (formato de los reportes del MSP). */
export function fechaATexto(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const [, y, mo, d] = m;
  return `${d} DE ${MESES[Number(mo) - 1]} DE ${y}`;
}

/** "07:45" -> "07:45 a.m." */
export function horaATexto(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return "";
  const h = Number(m[1]);
  const suffix = h < 12 ? "a.m." : "p.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${m[2]} ${suffix}`;
}

export function rangoHoras(inicio: string, fin: string): string {
  const a = horaATexto(inicio);
  const b = horaATexto(fin);
  return a && b ? `${a} - ${b}` : a || b;
}

/** Fecha local (zona configurada) a "yyyy-mm-dd". */
export function hoyISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ISO 8601 con desplazamiento local, p. ej. 2026-09-16T00:58:54-05:00 (formato de FirmaEC). */
export function isoConZona(date: Date): string {
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}
