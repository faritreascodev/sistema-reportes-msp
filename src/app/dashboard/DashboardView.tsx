"use client";

import Link from "next/link";
import {
  FileText,
  FilePlus2,
  CheckCircle2,
  Clock,
  PenLine,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
  Sparkles,
  ShieldCheck,
  Building,
  User,
} from "lucide-react";
import type { SessionPayload } from "@/lib/server/auth";

type DashboardStats = {
  total: number;
  consolidados: number;
  borradores: number;
  conFirma: number;
  totalImagenes: number;
};

type RecentReport = {
  id: string;
  fileName: string;
  tema: string;
  componente: string;
  fechaActividad: string;
  status: string;
  version: number;
  signaturesCount: number;
  updatedAt: string;
};

export function DashboardView({
  user,
  stats,
  componentesTop,
  recentReports,
}: {
  user: SessionPayload;
  stats: DashboardStats;
  componentesTop: { nombre: string; cantidad: number; porcentaje: number }[];
  recentReports: RecentReport[];
}) {
  const pctFirmados = stats.total > 0 ? Math.round((stats.conFirma / stats.total) * 100) : 0;
  const primerNombre = user.nombre.split(" ").slice(0, 2).join(" ");

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida Institucional */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-800 via-brand-700 to-brand-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-white/20">
              <Building className="h-3.5 w-3.5" />
              <span>Centro de Salud Tipo B N°1 · Distrito 08D01 Esmeraldas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bienvenida(o), {primerNombre}
            </h1>
            <p className="text-xs sm:text-sm text-brand-100 max-w-xl leading-relaxed">
              Sistema de generación de informes técnicos, control de evidencias fotográficas y firma digital vinculante para actividades de promoción y prevención en salud.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/reportes/nuevo"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs sm:text-sm font-bold text-brand-900 shadow-md hover:bg-brand-50 active:scale-98 transition-all cursor-pointer"
            >
              <FilePlus2 className="h-4 w-4 text-brand-600" />
              Nuevo Reporte
            </Link>
            <Link
              href="/reportes"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-xs sm:text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20 border border-white/20 transition-all cursor-pointer"
            >
              <Layers className="h-4 w-4" />
              Ver Historial
            </Link>
          </div>
        </div>

        {/* Círculos decorativos de fondo */}
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-brand-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-brand-600/30 blur-2xl" />
      </div>

      {/* Tarjetas de Métricas Ejecutivas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Informes</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">Actividades registradas</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Consolidados</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-emerald-800">{stats.consolidados}</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">Listos para entrega</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">En Borrador</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-amber-800">{stats.borradores}</div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium">Pendientes de cierre</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Firmados Digitalmente</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <PenLine className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-blue-800">{stats.conFirma}</div>
          <div className="mt-1 text-[11px] text-blue-700 font-medium">{pctFirmados}% de cobertura</div>
        </div>
      </div>

      {/* Grid de Contenido: Reportes Recientes y Distribución de Componentes */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de Reportes Recientes (2 Columnas) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-600" />
                Actividad Reciente
              </h2>
              <p className="text-[11px] text-slate-500">Últimos informes trabajados en la plataforma.</p>
            </div>
            <Link
              href="/reportes"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-900 transition"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentReports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
              Aún no tienes reportes recientes.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentReports.map((r) => (
                <div
                  key={r.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 hover:bg-slate-50/60 rounded-xl px-2 transition"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        {r.fechaActividad.split("-").reverse().join("/")}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                          r.status === "CONSOLIDADO"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.signaturesCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.2 text-[9px] font-bold text-blue-700 border border-blue-200">
                          <PenLine className="h-2.5 w-2.5" /> Firmado
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/reportes/${r.id}`}
                      className="block text-xs font-bold text-slate-900 group-hover:text-brand-700 truncate"
                    >
                      {r.tema || "Actividad sin tema"}
                    </Link>
                    <div className="text-[11px] text-brand-700 truncate">{r.componente}</div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Link
                      href={`/reportes/${r.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Editar
                    </Link>
                    <a
                      href={`/api/reportes/${r.id}/pdf`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-rose-50 px-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    >
                      PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribución por Componentes MSP (1 Columna) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-600" />
              Componentes de Salud
            </h2>
            <p className="text-[11px] text-slate-500">Frecuencia por áreas prioritarias del MSP.</p>
          </div>

          {componentesTop.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
              No hay datos suficientes aún.
            </div>
          ) : (
            <div className="space-y-3.5">
              {componentesTop.map((c) => (
                <div key={c.nombre} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[190px]" title={c.nombre}>
                      {c.nombre}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">{c.cantidad} ({c.porcentaje}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all duration-500"
                      style={{ width: `${Math.max(c.porcentaje, 6)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tarjeta de Seguridad Criptográfica de la Firma */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-brand-950">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              Firma Digital PAdES / FirmaEC
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Recuerda que tus reportes son legalmente verificables con el software oficial FirmaEC o Adobe Reader.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
