"use client";

import { Copy, FileDown, FileText, FilterX, Loader2, Pencil, PenLine, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SignDialog } from "@/components/SignDialog";
import { Badge, Button, Card, Input, Label, Select, Toast } from "@/components/ui";
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

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters((f) => ({ ...f, [k]: e.target.value }));

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

  async function remove(r: ReportSummary) {
    if (!confirm(`¿Eliminar definitivamente "${r.fileName}" con todas sus versiones y firmas?`)) return;
    setBusyId(r.id);
    try {
      await apiJson(`/api/reportes/${r.id}`, { method: "DELETE" });
      setToast({ msg: "Reporte eliminado", tone: "ok" });
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Historial de reportes</h1>
          <p className="text-sm text-gray-500">Reporte de verificable de actividades de promoción — borradores, consolidados y firmados.</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto]">
          <div>
            <Label htmlFor="q">Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-gray-400" />
              <Input id="q" className="pl-8" placeholder="Tema, archivo, lugar…" value={filters.q} onChange={set("q")} />
            </div>
          </div>
          <div>
            <Label htmlFor="comp">Componente</Label>
            <Select id="comp" value={filters.componente} onChange={set("componente")}>
              <option value="">Todos</option>
              {componentes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="st">Estado</Label>
            <Select id="st" value={filters.status} onChange={set("status")}>
              <option value="">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="CONSOLIDADO">Consolidado</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="mes">Mes / año</Label>
            <Input id="mes" type="month" value={filters.mes} onChange={set("mes")} />
          </div>
          <div>
            <Label htmlFor="desde">Desde</Label>
            <Input id="desde" type="date" value={filters.desde} onChange={set("desde")} />
          </div>
          <div>
            <Label htmlFor="hasta">Hasta</Label>
            <Input id="hasta" type="date" value={filters.hasta} onChange={set("hasta")} />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" onClick={() => setFilters(EMPTY)} disabled={!hasFilters} title="Limpiar filtros">
              <FilterX className="h-4 w-4" /> Limpiar
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {items === null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No hay reportes{hasFilters ? " con esos filtros" : ""}.{" "}
            <Link className="font-medium text-brand-600 hover:underline" href="/reportes/nuevo">
              Crear uno nuevo
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="w-16 px-4 py-2.5"></th>
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Componente / Tema</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5">Firmas</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      {r.thumbnailId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/imagenes/${r.thumbnailId}`} alt="" className="h-10 w-12 rounded object-cover ring-1 ring-gray-200" loading="lazy" />
                      ) : (
                        <div className="flex h-10 w-12 items-center justify-center rounded bg-gray-100 text-gray-400">
                          <FileText className="h-4 w-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{r.fechaActividad.split("-").reverse().join("/")}</div>
                      <div className="text-xs text-gray-500">act. {new Date(r.updatedAt).toLocaleDateString("es-EC")}</div>
                    </td>
                    <td className="max-w-[520px] px-3 py-2.5">
                      <Link href={`/reportes/${r.id}`} className="line-clamp-1 font-medium text-gray-900 hover:text-brand-700">
                        {r.tema}
                      </Link>
                      <div className="line-clamp-1 text-xs text-gray-500">{r.componente}</div>
                      <div className="line-clamp-1 text-[11px] text-gray-400">{r.fileName}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Badge tone={r.status === "CONSOLIDADO" ? "green" : "amber"}>{r.status === "CONSOLIDADO" ? "Consolidado" : "Borrador"}</Badge>
                      <span className="ml-1.5 text-xs text-gray-500">v{r.version}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.signatures > 0 ? (
                        <Badge tone="blue">
                          <PenLine className="h-3 w-3" /> {r.signatures}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/reportes/${r.id}`} title="Editar" className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Link>
                        <Button size="sm" variant="ghost" title="Duplicar" onClick={() => duplicate(r.id)} disabled={busyId === r.id}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <a href={`/api/reportes/${r.id}/docx`} title="Descargar Word" className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-blue-700 hover:bg-blue-50">
                          <FileDown className="h-3.5 w-3.5" /> DOCX
                        </a>
                        <a href={`/api/reportes/${r.id}/pdf`} title="Descargar PDF" className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-red-700 hover:bg-red-50">
                          <FileDown className="h-3.5 w-3.5" /> PDF
                        </a>
                        <Button size="sm" variant="secondary" onClick={() => openSign(r.id)} disabled={busyId === r.id}>
                          <PenLine className="h-3.5 w-3.5" /> Firmar
                        </Button>
                        <Button size="icon" variant="ghost" title="Eliminar" onClick={() => remove(r)} disabled={busyId === r.id} className="text-gray-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SignDialog
        open={!!signTarget}
        onClose={() => setSignTarget(null)}
        reportId={signTarget?.id ?? null}
        fileName={signTarget?.data.fileName ?? "reporte"}
        responsables={signTarget?.data.responsables ?? []}
        onSigned={(name) => {
          setToast({ msg: `PDF firmado por ${name || "el titular"} y descargado`, tone: "ok" });
          load();
        }}
      />
      <Toast message={toast?.msg ?? null} tone={toast?.tone ?? "ok"} onClose={() => setToast(null)} />
    </div>
  );
}
