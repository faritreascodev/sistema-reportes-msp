"use client";

import {
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  FileDown,
  History,
  Loader2,
  PenLine,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SignDialog } from "@/components/SignDialog";
import { Badge, Button, Card, CardHeader, Dialog, Input, Label, Textarea, Toast } from "@/components/ui";
import { COMPONENTES_SUGERIDOS, TECNICAS_SUGERIDAS } from "@/lib/defaults";
import { fechaATexto, rangoHoras } from "@/lib/fechas";
import {
  MAX_COORDINADOS,
  MAX_RESPONSABLES,
  reportDataSchema,
  type ReportData,
  type SignatureInfo,
  type VersionInfo,
} from "@/lib/report-types";
import { apiJson, cn, downloadResponse } from "@/lib/utils";
import { ImageSlot } from "./ImageSlot";
import { PreviewFrame } from "./PreviewFrame";

type ServerReport = { id: string; version: number; data: ReportData; versions: VersionInfo[]; signatures: SignatureInfo[] };

export function ReportEditor({
  initial,
  reportId: initialId = null,
  version: initialVersion = 0,
  versions: initialVersions = [],
  signatures: initialSignatures = [],
  componentes = [],
}: {
  initial: ReportData;
  reportId?: string | null;
  version?: number;
  versions?: VersionInfo[];
  signatures?: SignatureInfo[];
  componentes?: string[];
}) {
  const router = useRouter();
  const [reportId, setReportId] = useState<string | null>(initialId);
  const [data, setData] = useState<ReportData>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [version, setVersion] = useState(initialVersion);
  const [versions, setVersions] = useState(initialVersions);
  const [signatures, setSignatures] = useState(initialSignatures);
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [versionNote, setVersionNote] = useState<string | null>(null);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");

  const dirty = useMemo(() => JSON.stringify(data) !== saved, [data, saved]);
  const notify = useCallback((msg: string, tone: "ok" | "error" = "ok") => setToast({ msg, tone }), []);
  const update = <K extends keyof ReportData>(key: K, value: ReportData[K]) => setData((d) => ({ ...d, [key]: value }));
  const text = (key: keyof ReportData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(key, e.target.value as never);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function validate(): ReportData | null {
    const r = reportDataSchema.safeParse(data);
    if (!r.success) {
      notify(r.error.issues[0]?.message ?? "Revise los datos del formulario", "error");
      return null;
    }
    return r.data;
  }

  const save = useCallback(
    async (mode: "overwrite" | "new-version", note?: string): Promise<string | null> => {
      const valid = validate();
      if (!valid) return null;
      setBusy(mode);
      try {
        let res: ServerReport;
        if (!reportId) {
          const created = await apiJson<{ id: string }>("/api/reportes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: valid }) });
          res = await apiJson<ServerReport>(`/api/reportes/${created.id}`);
          router.replace(`/reportes/${created.id}`);
        } else {
          res = await apiJson<ServerReport>(`/api/reportes/${reportId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: valid, mode, note: note || undefined }),
          });
        }
        setReportId(res.id);
        setVersion(res.version);
        setVersions(res.versions);
        setSignatures(res.signatures);
        setData(res.data);
        setSaved(JSON.stringify(res.data));
        setLoadedVersion(null);
        notify(mode === "new-version" && reportId ? `Guardado como versión ${res.version}` : `Guardado (v${res.version})`);
        return res.id;
      } catch (e) {
        notify((e as Error).message, "error");
        return null;
      } finally {
        setBusy(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, reportId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save("overwrite");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  async function exportFile(fmt: "docx" | "pdf") {
    const valid = validate();
    if (!valid) return;
    setBusy(fmt);
    try {
      const res = await fetch(`/api/exportar/${fmt}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: valid }) });
      await downloadResponse(res, `${valid.fileName}.${fmt}`);
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function openVersion(v: number) {
    if (!reportId) return;
    if (dirty && !confirm("Hay cambios sin guardar. ¿Descartarlos y abrir la versión " + v + "?")) return;
    try {
      const res = await apiJson<{ data: ReportData }>(`/api/reportes/${reportId}/versiones/${v}`);
      setData(res.data);
      setLoadedVersion(v === version ? null : v);
      if (v === version) setSaved(JSON.stringify(res.data));
      notify(v === version ? `Versión actual (v${v})` : `Versión ${v} cargada en el editor. Guárdela como nueva versión o sobrescriba la actual.`);
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }

  async function refreshSignatures() {
    if (!reportId) return;
    const res = await apiJson<ServerReport>(`/api/reportes/${reportId}`);
    setSignatures(res.signatures);
  }

  async function verify(sigId: string) {
    try {
      const res = await apiJson<{ signatures: { digestOk: boolean; signatureOk: boolean; coversWholeFile: boolean; essCertOk: boolean | null }[] }>(
        `/api/firmas/${sigId}?verificar=1`,
      );
      const s = res.signatures[0];
      const ok = s && s.digestOk && s.signatureOk && s.coversWholeFile && s.essCertOk !== false;
      notify(ok ? "Firma íntegra y criptográficamente válida (SHA-256 con RSA)" : "La firma NO es válida o el archivo fue modificado", ok ? "ok" : "error");
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }

  const setResp = (i: number, k: "nombres" | "cargo", v: string) =>
    update(
      "responsables",
      data.responsables.map((r, j) => (j === i ? { ...r, [k]: v } : r)),
    );
  const setCoord = (i: number, k: "nombre" | "institucion" | "cargo", v: string) =>
    update(
      "coordinados",
      data.coordinados.map((r, j) => (j === i ? { ...r, [k]: v } : r)),
    );

  const allComponentes = [...new Set([...COMPONENTES_SUGERIDOS, ...componentes])];

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-gray-200 bg-[#f4f5f9]/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200" aria-label="Volver al historial">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold text-gray-900">{data.fileName || "Reporte sin nombre"}</h1>
                {reportId ? <Badge tone="blue">v{version}</Badge> : <Badge>Nuevo</Badge>}
                <Badge tone={data.status === "CONSOLIDADO" ? "green" : "amber"}>{data.status === "CONSOLIDADO" ? "Consolidado" : "Borrador"}</Badge>
                {loadedVersion && <Badge tone="amber">Editando copia de v{loadedVersion}</Badge>}
              </div>
              <p className="text-xs text-gray-500">{dirty ? "Cambios sin guardar · Ctrl+S para guardar" : reportId ? "Todos los cambios guardados" : "Aún no guardado"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => save("overwrite")} disabled={!!busy || (!dirty && !!reportId)}>
              {busy === "overwrite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {reportId ? "Guardar" : "Crear reporte"}
            </Button>
            {reportId && (
              <Button variant="outline" onClick={() => validate() && setVersionNote("")} disabled={!!busy}>
                {busy === "new-version" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Guardar como v{version + 1}
              </Button>
            )}
            <Button variant="outline" onClick={() => exportFile("docx")} disabled={!!busy}>
              {busy === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4 text-blue-700" />}
              Word
            </Button>
            <Button variant="outline" onClick={() => exportFile("pdf")} disabled={!!busy}>
              {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4 text-red-700" />}
              PDF
            </Button>
            <Button variant="secondary" onClick={() => validate() && setSignOpen(true)} disabled={!!busy}>
              <PenLine className="h-4 w-4" /> Firmar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Formulario */}
        <div className="space-y-4">
          <Card>
            <CardHeader icon={<ClipboardList className="h-4 w-4" />} title="Documento" description="Nombre del archivo, estado y encabezado del reporte." />
            <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
              <div>
                <Label htmlFor="fileName" hint=".docx / .pdf">
                  Nombre del archivo / título
                </Label>
                <Input id="fileName" value={data.fileName} onChange={text("fileName")} />
              </div>
              <div>
                <Label>Estado</Label>
                <div className="flex h-9 rounded-md border border-gray-300 bg-white p-0.5 text-xs font-medium">
                  {(["BORRADOR", "CONSOLIDADO"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update("status", s)}
                      className={cn("rounded px-3", data.status === s ? (s === "CONSOLIDADO" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white") : "text-gray-600 hover:bg-gray-100")}
                    >
                      {s === "BORRADOR" ? "Borrador" : "Consolidado"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="encabezado">Encabezado</Label>
                <Input id="encabezado" value={data.encabezado} onChange={text("encabezado")} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon={<Clock className="h-4 w-4" />} title="Datos de la actividad" />
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="componente">Componente</Label>
                <Input id="componente" list="componentes" value={data.componente} onChange={text("componente")} placeholder="SALUD SEXUAL Y REPRODUCTIVA" />
                <datalist id="componentes">
                  {allComponentes.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="tema">Tema</Label>
                <Textarea id="tema" rows={2} value={data.tema} onChange={text("tema")} placeholder="171 OPCIÓN 2" />
              </div>
              <div>
                <Label htmlFor="fecha">Fecha de la actividad</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={data.fechaActividad}
                  onChange={(e) => setData((d) => ({ ...d, fechaActividad: e.target.value, fechaTexto: fechaATexto(e.target.value) || d.fechaTexto }))}
                />
              </div>
              <div>
                <Label htmlFor="fechaTexto" hint="se genera de la fecha">
                  Fecha (texto en el reporte)
                </Label>
                <Input id="fechaTexto" value={data.fechaTexto} onChange={text("fechaTexto")} />
              </div>
              <div>
                <Label htmlFor="lugar">Lugar</Label>
                <Input id="lugar" value={data.lugar} onChange={text("lugar")} />
              </div>
              <div>
                <Label htmlFor="tecnica">Técnica utilizada</Label>
                <Input id="tecnica" list="tecnicas" value={data.tecnica} onChange={text("tecnica")} />
                <datalist id="tecnicas">
                  {TECNICAS_SUGERIDAS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="hora" hint="o use el asistente →">
                  Hora
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Input id="hora" className="min-w-[220px] flex-1" value={data.hora} onChange={text("hora")} />
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Input
                      type="time"
                      aria-label="Hora de inicio"
                      className="w-[120px]"
                      value={horaInicio}
                      onChange={(e) => {
                        setHoraInicio(e.target.value);
                        update("hora", rangoHoras(e.target.value, horaFin));
                      }}
                    />
                    a
                    <Input
                      type="time"
                      aria-label="Hora de fin"
                      className="w-[120px]"
                      value={horaFin}
                      onChange={(e) => {
                        setHoraFin(e.target.value);
                        update("hora", rangoHoras(horaInicio, e.target.value));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon={<ClipboardList className="h-4 w-4" />} title="Registro de participantes" description="Hoja de registro escaneada o fotografiada. Se ajusta al ancho del margen." />
            <div className="p-4">
              <ImageSlot label="Hoja de registro" imageId={data.registroImageId} onChange={(id) => update("registroImageId", id)} aspect={NaN} onError={(m) => notify(m, "error")} />
            </div>
          </Card>

          <Card>
            <CardHeader icon={<Camera className="h-4 w-4" />} title="Registro fotográfico" description="Hasta 4 fotos en grilla 2×2 (recorte sugerido 4:3)." />
            <div className="grid grid-cols-2 gap-3 p-4">
              {data.fotoIds.map((id, i) => (
                <ImageSlot
                  key={i}
                  label={`Foto ${i + 1}`}
                  imageId={id}
                  aspect={4 / 3}
                  onChange={(nid) => update("fotoIds", data.fotoIds.map((x, j) => (j === i ? nid : x)))}
                  onError={(m) => notify(m, "error")}
                />
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<Users className="h-4 w-4" />}
              title="Responsable/s de la actividad (funcionarios MSP)"
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={data.responsables.length >= MAX_RESPONSABLES}
                  onClick={() => update("responsables", [...data.responsables, { nombres: "", cargo: "" }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </Button>
              }
            />
            <div className="space-y-3 p-4">
              {data.responsables.map((r, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <Label>Nombres y apellidos</Label>
                    <Input value={r.nombres} onChange={(e) => setResp(i, "nombres", e.target.value)} />
                  </div>
                  <div>
                    <Label>Cargo</Label>
                    <Input value={r.cargo} onChange={(e) => setResp(i, "cargo", e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Quitar responsable"
                      disabled={data.responsables.length <= 1}
                      onClick={() => update("responsables", data.responsables.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500">La columna FIRMA queda en blanco para la firma manuscrita o la estampa de firma electrónica.</p>
            </div>
          </Card>

          <Card>
            <CardHeader icon={<Building2 className="h-4 w-4" />} title="Actividad coordinada con otra institución" />
            <div className="space-y-3 p-4">
              <div className="flex gap-4 text-sm">
                {[
                  { v: true, l: "Sí" },
                  { v: false, l: "No" },
                ].map((o) => (
                  <label key={o.l} className="flex cursor-pointer items-center gap-2">
                    <input type="radio" name="coordinada" className="accent-brand-600" checked={data.coordinada === o.v} onChange={() => update("coordinada", o.v)} />
                    {o.l}
                  </label>
                ))}
              </div>
              {data.coordinada && (
                <>
                  {data.coordinados.map((c, i) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <div>
                        <Label>Nombre</Label>
                        <Input value={c.nombre} onChange={(e) => setCoord(i, "nombre", e.target.value)} />
                      </div>
                      <div>
                        <Label>Institución</Label>
                        <Input value={c.institucion} onChange={(e) => setCoord(i, "institucion", e.target.value)} />
                      </div>
                      <div>
                        <Label>Cargo</Label>
                        <Input value={c.cargo} onChange={(e) => setCoord(i, "cargo", e.target.value)} />
                      </div>
                      <div className="flex items-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Quitar"
                          disabled={data.coordinados.length <= 1}
                          onClick={() => update("coordinados", data.coordinados.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={data.coordinados.length >= MAX_COORDINADOS}
                    onClick={() => update("coordinados", [...data.coordinados, { nombre: "", institucion: "", cargo: "" }])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar persona
                  </Button>
                </>
              )}
            </div>
          </Card>

          <Card>
            <details>
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-900">Membrete institucional (encabezado de página)</summary>
              <div className="space-y-2 border-t border-gray-100 p-4">
                {data.institucion.map((l, i) => (
                  <Input key={i} value={l} onChange={(e) => update("institucion", data.institucion.map((x, j) => (j === i ? e.target.value : x)))} />
                ))}
              </div>
            </details>
          </Card>

          {reportId && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader icon={<History className="h-4 w-4" />} title="Versiones" description="Abra una versión anterior para editarla o descargarla." />
                <ul className="divide-y divide-gray-100 text-sm">
                  {versions.map((v) => (
                    <li key={v.version} className="flex items-center justify-between gap-2 px-4 py-2">
                      <div className="min-w-0">
                        <div className="font-medium">
                          v{v.version} {v.version === version && <span className="text-xs font-normal text-emerald-600">(actual)</span>}
                        </div>
                        <div className="truncate text-xs text-gray-500">
                          {new Date(v.updatedAt).toLocaleString("es-EC")} {v.note ? `· ${v.note}` : ""}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openVersion(v.version)}>
                          Abrir
                        </Button>
                        <a className="inline-flex h-8 items-center rounded-md px-2 text-xs text-blue-700 hover:bg-blue-50" href={`/api/reportes/${reportId}/docx?version=${v.version}`}>
                          DOCX
                        </a>
                        <a className="inline-flex h-8 items-center rounded-md px-2 text-xs text-red-700 hover:bg-red-50" href={`/api/reportes/${reportId}/pdf?version=${v.version}`}>
                          PDF
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <CardHeader icon={<ShieldCheck className="h-4 w-4" />} title="PDF firmados" />
                {signatures.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-500">Aún no hay firmas electrónicas.</p>
                ) : (
                  <ul className="divide-y divide-gray-100 text-sm">
                    {signatures.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{s.signerName}</div>
                          <div className="truncate text-xs text-gray-500">
                            v{s.reportVersion} · {new Date(s.signedAt).toLocaleString("es-EC")} · {s.issuer}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button size="sm" variant="ghost" title="Verificar firma" onClick={() => verify(s.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <a className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-red-700 hover:bg-red-50" href={`/api/firmas/${s.id}`}>
                            <FileDown className="h-3.5 w-3.5" /> PDF
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Vista previa */}
        <div className="xl:sticky xl:top-[128px] xl:max-h-[calc(100vh-140px)] xl:overflow-y-auto">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold tracking-wide text-gray-600 uppercase">Vista previa</span>
            <span>Idéntica al PDF generado · A4</span>
          </div>
          <PreviewFrame data={data} />
        </div>
      </div>

      <SignDialog
        open={signOpen}
        onClose={() => setSignOpen(false)}
        reportId={reportId}
        fileName={data.fileName}
        responsables={data.responsables}
        beforeSign={async () => (dirty || !reportId ? save("overwrite") : reportId)}
        onSigned={(name) => {
          notify(`PDF firmado por ${name || "el titular"} y descargado`);
          refreshSignatures();
        }}
      />
      <Dialog
        open={versionNote !== null}
        onClose={() => setVersionNote(null)}
        title={`Guardar como versión ${version + 1}`}
        description="La versión actual queda intacta en el historial."
        footer={
          <>
            <Button variant="outline" onClick={() => setVersionNote(null)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                const note = versionNote?.trim() || undefined;
                setVersionNote(null);
                await save("new-version", note);
              }}
            >
              <Copy className="h-4 w-4" /> Crear v{version + 1}
            </Button>
          </>
        }
      >
        <Label htmlFor="vnote" hint="opcional">
          Nota de la versión
        </Label>
        <Input id="vnote" autoFocus placeholder="Ej.: réplica del 15/10/2026" value={versionNote ?? ""} onChange={(e) => setVersionNote(e.target.value)} />
      </Dialog>
      <Toast message={toast?.msg ?? null} tone={toast?.tone ?? "ok"} onClose={() => setToast(null)} />
    </div>
  );
}
