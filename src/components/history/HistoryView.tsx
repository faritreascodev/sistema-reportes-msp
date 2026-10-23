"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileCheck2,
  FileDown,
  FileEdit,
  FileText,
  FilterX,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  PenLine,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SignDialog } from "@/components/SignDialog";
import { Badge, Button, Card, Dialog, Input, Label, Select, Toast } from "@/components/ui";
import type { ReportDetail, ReportSummary } from "@/lib/report-types";
import { apiJson } from "@/lib/utils";

type Filters = { q: string; componente: string; status: string; mes: string; desde: string; hasta: string };
const EMPTY: Filters = { q: "", componente: "", status: "", mes: "", desde: "", hasta: "" };

export function HistoryView() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [items, setItems] = useState<ReportSummary[] | null>(null);
  const [componentes, setComponentes] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(null);
  const [signTarget, setSignTarget] = useState<ReportDetail | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [deleteTarget, setDeleteTarget] = useState<ReportSummary | null>(null);
  const [quickFilter, setQuickFilter] = useState<"ALL" | "BORRADOR" | "CONSOLIDADO" | "FIRMADO">("ALL");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 250);
    return () => clearTimeout(t);
  }, [filters.q]);

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    const f = { ...filters, q: debouncedQ };
    for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
    try {
      const res = await apiJson<{ items: ReportSummary[]; componentes: string[] }>(`/api/reportes?${p}`);
      setItems(res.items);
      setComponentes(res.componentes);
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "error" });
      setItems([]);
    }
  }, [filters, debouncedQ]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  async function duplicate(id: string) {
    setBusyId(id);
    try {
      const r = await apiJson<ReportDetail>(`/api/reportes/${id}/duplicar`, { method: "POST" });
      router.push(`/reportes/${r.id}`);
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "error" });
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await apiJson(`/api/reportes/${deleteTarget.id}`, { method: "DELETE" });
      setToast({ msg: "Reporte eliminado con éxito", tone: "ok" });
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function openSign(id: string) {
    setBusyId(id);
    try {
      setSignTarget(await apiJson<ReportDetail>(`/api/reportes/${id}`));
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "error" });
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters = Object.values(filters).some(Boolean);

  // Filtrado rápido cliente
  const filteredItems = useMemo(() => {
    if (!items) return null;
    if (quickFilter === "BORRADOR") return items.filter((i) => i.status === "BORRADOR");
    if (quickFilter === "CONSOLIDADO") return items.filter((i) => i.status === "CONSOLIDADO");
    if (quickFilter === "FIRMADO") return items.filter((i) => i.signatures > 0);
    return items;
  }, [items, quickFilter]);

  // Contadores para métricas
  const stats = useMemo(() => {
    if (!items) return { total: 0, borradores: 0, consolidados: 0, firmados: 0 };
    return {
      total: items.length,
      borradores: items.filter((i) => i.status === "BORRADOR").length,
      consolidados: items.filter((i) => i.status === "CONSOLIDADO").length,
      firmados: items.filter((i) => i.signatures > 0).length,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones Principales */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-600" />
            Mis Reportes de Promoción
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Documentos oficiales de actividades en territorio — Centro de Salud Tipo B N°1 Esmeraldas.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/reportes/nuevo"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            Crear Nuevo Reporte
          </Link>
        </div>
      </div>

      {/* Métricas Visuales / KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setQuickFilter("ALL")}
          className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${
            quickFilter === "ALL"
              ? "border-brand-500 bg-brand-50/50 shadow-xs ring-1 ring-brand-500"
              : "border-gray-200 bg-white hover:border-gray-300 shadow-xs"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-[11px] font-medium text-gray-500">Total Reportes</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter("BORRADOR")}
          className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${
            quickFilter === "BORRADOR"
              ? "border-amber-500 bg-amber-50/50 shadow-xs ring-1 ring-amber-500"
              : "border-gray-200 bg-white hover:border-gray-300 shadow-xs"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <FileEdit className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-800">{stats.borradores}</div>
            <div className="text-[11px] font-medium text-amber-700">En Borrador</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter("CONSOLIDADO")}
          className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${
            quickFilter === "CONSOLIDADO"
              ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500"
              : "border-gray-200 bg-white hover:border-gray-300 shadow-xs"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-800">{stats.consolidados}</div>
            <div className="text-[11px] font-medium text-emerald-700">Consolidados</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter("FIRMADO")}
          className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${
            quickFilter === "FIRMADO"
              ? "border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500"
              : "border-gray-200 bg-white hover:border-gray-300 shadow-xs"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-blue-800">{stats.firmados}</div>
            <div className="text-[11px] font-medium text-blue-700">Con Firma Digital</div>
          </div>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="p-4 rounded-xl border-gray-200">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2">
            <Label htmlFor="q">Buscar por texto</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-gray-400" />
              <Input
                id="q"
                className="pl-8 text-xs"
                placeholder="Tema, nombre del archivo, lugar..."
                value={filters.q}
                onChange={set("q")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="comp">Componente MSP</Label>
            <Select id="comp" className="text-xs" value={filters.componente} onChange={set("componente")}>
              <option value="">Todos los componentes</option>
              {componentes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="st">Estado</Label>
            <Select id="st" className="text-xs" value={filters.status} onChange={set("status")}>
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="CONSOLIDADO">Consolidado</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="mes">Mes / Año</Label>
            <Input id="mes" type="month" className="text-xs" value={filters.mes} onChange={set("mes")} />
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => {
                setFilters(EMPTY);
                setQuickFilter("ALL");
              }}
              disabled={!hasFilters && quickFilter === "ALL"}
            >
              <FilterX className="h-3.5 w-3.5" />
              Restablecer
            </Button>
          </div>
        </div>
      </Card>

      {/* Controles de Vista y Lista de Reportes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium">
            {filteredItems ? `${filteredItems.length} reportes encontrados` : "Cargando reportes..."}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                viewMode === "cards" ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Tarjetas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                viewMode === "table" ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Tabla
            </button>
          </div>
        </div>

        {filteredItems === null ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <p className="text-sm font-medium">Cargando sus reportes institucionales...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-xs">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">No se encontraron reportes</h3>
            <p className="mt-1 text-xs text-gray-500">
              {hasFilters || quickFilter !== "ALL"
                ? "No existen reportes que coincidan con los filtros seleccionados."
                : "Aún no ha creado ningún reporte de actividades."}
            </p>
            <div className="mt-5">
              <Link
                href="/reportes/nuevo"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                <Sparkles className="h-4 w-4" />
                Crear Mi Primer Reporte
              </Link>
            </div>
          </div>
        ) : viewMode === "cards" ? (
          /* Grid de Tarjetas Visuales */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((r) => (
              <div
                key={r.id}
                className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Imagen de previsualización y badges */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200/60">
                    {r.thumbnailId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/imagenes/${r.thumbnailId}`}
                        alt={r.tema}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400">
                        <FileText className="h-10 w-10 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <Badge tone={r.status === "CONSOLIDADO" ? "green" : "amber"}>
                        {r.status === "CONSOLIDADO" ? "Consolidado" : "Borrador"}
                      </Badge>
                      <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                        v{r.version}
                      </span>
                    </div>
                    {r.signatures > 0 && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                        <PenLine className="h-3 w-3" /> Firmado
                      </div>
                    )}
                  </div>

                  {/* Información del Reporte */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mb-1">
                      <span>{r.fechaActividad.split("-").reverse().join("/")}</span>
                      <span className="truncate max-w-[150px]">{r.fileName}</span>
                    </div>
                    <Link
                      href={`/reportes/${r.id}`}
                      className="line-clamp-2 text-sm font-bold text-gray-900 hover:text-brand-700 transition"
                      title={r.tema}
                    >
                      {r.tema || "Actividad de Promoción"}
                    </Link>
                    <p className="line-clamp-1 text-xs text-brand-700 font-medium mt-1">
                      {r.componente || "Componente de Salud"}
                    </p>
                  </div>
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/reportes/${r.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      title="Editar reporte"
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-500" />
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => openSign(r.id)}
                      disabled={busyId === r.id}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-50 px-2.5 text-xs font-bold text-brand-700 hover:bg-brand-100 cursor-pointer"
                      title="Firmar electrónicamente con .p12"
                    >
                      <PenLine className="h-3.5 w-3.5 text-brand-600" />
                      Firmar
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={`/api/reportes/${r.id}/docx`}
                      title="Descargar Microsoft Word (.docx)"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-700 hover:bg-blue-50"
                    >
                      <FileDown className="h-4 w-4" />
                    </a>
                    <a
                      href={`/api/reportes/${r.id}/pdf`}
                      title="Descargar Documento PDF"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-700 hover:bg-rose-50"
                    >
                      <FileDown className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => duplicate(r.id)}
                      disabled={busyId === r.id}
                      title="Duplicar reporte"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(r)}
                      disabled={busyId === r.id}
                      title="Eliminar reporte"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Vista Tabla Institucional */
          <Card className="overflow-hidden rounded-xl border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="bg-gray-50/80 text-left font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="w-16 px-4 py-3">Miniatura</th>
                    <th className="px-3 py-3">Fecha</th>
                    <th className="px-3 py-3">Componente y Tema</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Firma</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-2.5">
                        {r.thumbnailId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/imagenes/${r.thumbnailId}`}
                            alt=""
                            className="h-10 w-14 rounded object-cover ring-1 ring-gray-200"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-10 w-14 items-center justify-center rounded bg-gray-100 text-gray-400">
                            <FileText className="h-4 w-4" />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-gray-900">
                        <div>{r.fechaActividad.split("-").reverse().join("/")}</div>
                        <div className="text-[10px] text-gray-400 font-normal">v{r.version}</div>
                      </td>
                      <td className="max-w-[420px] px-3 py-2.5">
                        <Link href={`/reportes/${r.id}`} className="font-bold text-gray-900 hover:text-brand-700 line-clamp-1">
                          {r.tema || "Sin tema especificado"}
                        </Link>
                        <div className="text-brand-700 font-medium line-clamp-1">{r.componente}</div>
                        <div className="text-[11px] text-gray-400 truncate">{r.fileName}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Badge tone={r.status === "CONSOLIDADO" ? "green" : "amber"}>
                          {r.status === "CONSOLIDADO" ? "Consolidado" : "Borrador"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        {r.signatures > 0 ? (
                          <Badge tone="green">
                            <PenLine className="h-3 w-3" /> Firmado
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/reportes/${r.id}`}
                            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            <Pencil className="h-3 w-3" /> Editar
                          </Link>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openSign(r.id)}
                            disabled={busyId === r.id}
                            className="h-7 text-xs font-bold"
                          >
                            <PenLine className="h-3 w-3" /> Firmar
                          </Button>
                          <a
                            href={`/api/reportes/${r.id}/docx`}
                            title="Descargar DOCX"
                            className="inline-flex h-7 items-center rounded-md px-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
                          >
                            DOCX
                          </a>
                          <a
                            href={`/api/reportes/${r.id}/pdf`}
                            title="Descargar PDF"
                            className="inline-flex h-7 items-center rounded-md px-2 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            PDF
                          </a>
                          <button
                            type="button"
                            onClick={() => duplicate(r.id)}
                            disabled={busyId === r.id}
                            title="Duplicar"
                            className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
                            disabled={busyId === r.id}
                            title="Eliminar"
                            className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Modal Confirmación de Eliminación Seguro */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={
          <span className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
            ¿Eliminar este reporte permanentemente?
          </span>
        }
        description="Esta acción eliminará el reporte, sus imágenes adjuntas y todas las versiones históricas registradas."
      >
        <div className="space-y-3 py-2">
          {deleteTarget && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs border border-gray-200">
              <p className="font-bold text-gray-900">{deleteTarget.fileName}</p>
              <p className="text-gray-500 mt-0.5">{deleteTarget.tema}</p>
              <p className="text-gray-400 text-[11px] mt-1">
                Fecha: {deleteTarget.fechaActividad} · Versión: v{deleteTarget.version}
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500">
            Confirme si desea continuar. No se podrá recuperar la información una vez eliminada.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={!!busyId}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!!busyId}
              className="bg-red-600 hover:bg-red-700"
            >
              {busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Sí, eliminar definitivamente
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal de Firma Electrónica */}
      <SignDialog
        open={!!signTarget}
        onClose={() => setSignTarget(null)}
        reportId={signTarget?.id ?? null}
        fileName={signTarget?.data.fileName ?? "reporte"}
        responsables={signTarget?.data.responsables ?? []}
        onSigned={(name) => {
          setToast({ msg: `PDF firmado exitosamente por ${name || "el funcionario"} y descargado`, tone: "ok" });
          load();
        }}
      />

      <Toast message={toast?.msg ?? null} tone={toast?.tone ?? "ok"} onClose={() => setToast(null)} />
    </div>
  );
}
