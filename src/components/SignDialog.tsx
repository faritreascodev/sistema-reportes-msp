"use client";

import { Eye, EyeOff, FileKey2, KeyRound, Loader2, PenLine, ShieldCheck, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Dialog, Input, Label, Select } from "@/components/ui";
import type { Responsable } from "@/lib/report-types";
import { downloadResponse } from "@/lib/utils";

/**
 * Firma con certificado .p12/.pfx. El archivo y la contraseña se envían una sola vez al servidor
 * local, se usan en memoria y no se almacenan. El PDF firmado se descarga con sufijo -signed.pdf.
 */
export function SignDialog({
  open,
  onClose,
  reportId,
  fileName,
  responsables,
  beforeSign,
  onSigned,
}: {
  open: boolean;
  onClose: () => void;
  reportId: string | null;
  fileName: string;
  responsables: Responsable[];
  /** p. ej. guardar los cambios pendientes del editor; devuelve el id del reporte guardado */
  beforeSign?: () => Promise<string | null>;
  onSigned?: (signerName: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [responsable, setResponsable] = useState(0);
  const [subFilter, setSubFilter] = useState("adbe.pkcs7.detached");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setShowPassword(false);
      setError(null);
      setBusy(false);
      setFile(null);
    }
  }, [open]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.name.endsWith(".p12") || droppedFile.name.endsWith(".pfx")) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Por favor seleccione un archivo de firma con extensión .p12 o .pfx");
      }
    }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !password) return;
    setBusy(true);
    setError(null);
    try {
      const id = beforeSign ? await beforeSign() : reportId;
      if (!id) throw new Error("Guarde el reporte antes de firmarlo");
      const form = new FormData();
      form.set("certificado", file);
      form.set("password", password);
      form.set("responsable", String(responsable));
      form.set("subFilter", subFilter);
      const res = await fetch(`/api/reportes/${id}/firmar`, { method: "POST", body: form });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Error ${res.status} al firmar el documento`);
      }
      const signer = decodeURIComponent(res.headers.get("X-Signer-Name") ?? "");
      await downloadResponse(res, `${fileName}-signed.pdf`);
      setPassword("");
      onSigned?.(signer);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo firmar el reporte");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={
        <span className="flex items-center gap-2 text-brand-900 font-semibold">
          <PenLine className="h-5 w-5 text-brand-600" />
          Firma Electrónica Oficial (PAdES / PKCS#7)
        </span>
      }
      description="Certificados admitidos: BCE, Consejo de la Judicatura, Security Data, ANF, UANATACA y FirmaEC."
    >
      <form id="sign-form" onSubmit={submit} className="space-y-4 pt-1">
        <div>
          <Label htmlFor="cert" hint=".p12 o .pfx">
            Archivo de Firma Digital
          </Label>
          <label
            htmlFor="cert"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-brand-500 bg-brand-50/80 scale-[1.01]"
                : file
                ? "border-emerald-300 bg-emerald-50/50"
                : "border-gray-300 bg-gray-50/80 hover:border-brand-400 hover:bg-brand-50/30"
            }`}
          >
            {file ? (
              <div className="flex items-center gap-2.5 text-emerald-800">
                <FileKey2 className="h-6 w-6 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight truncate max-w-[280px]">{file.name}</p>
                  <p className="text-[11px] text-emerald-600">{(file.size / 1024).toFixed(1)} KB · Clic o arrastra para cambiar</p>
                </div>
              </div>
            ) : (
              <>
                <UploadCloud className="h-7 w-7 text-brand-600" />
                <div className="text-xs">
                  <span className="font-semibold text-brand-700 hover:underline">Selecciona tu archivo .p12/.pfx</span> o arrástralo aquí
                </div>
                <span className="text-[10px] text-gray-400">Certificado PKCS#12 con clave privada</span>
              </>
            )}
          </label>
          <input
            id="cert"
            type="file"
            accept=".p12,.pfx,application/x-pkcs12"
            className="sr-only"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />
        </div>

        <div>
          <Label htmlFor="pwd">Contraseña del Certificado</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-gray-400" />
            <Input
              id="pwd"
              type={showPassword ? "text" : "password"}
              autoComplete="off"
              className="pl-8 pr-10"
              placeholder="Contraseña de su firma digital"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="resp">Casilla del Funcionario</Label>
            <Select id="resp" value={responsable} onChange={(e) => setResponsable(Number(e.target.value))}>
              {responsables.map((r, i) => (
                <option key={i} value={i}>
                  {r.nombres || `Responsable ${i + 1}`} {r.cargo ? `(${r.cargo})` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="fmt">Estándar Criptográfico</Label>
            <Select id="fmt" value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
              <option value="adbe.pkcs7.detached">FirmaEC / Adobe PKCS#7 Detached (Recomendado)</option>
              <option value="ETSI.CAdES.detached">PAdES-B (Norma Europea / ETSI CAdES)</option>
            </Select>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div className="space-y-0.5 leading-relaxed text-[11px]">
            <p className="font-semibold text-brand-950">Garantía de Cero Almacenamiento (Zero-Knowledge)</p>
            <p className="text-blue-800">
              Su certificado y contraseña son utilizados <strong>únicamente en memoria RAM volátil</strong> durante la operación de firmado.
              Bajo ninguna circunstancia se guardan en el servidor ni en bases de datos. El PDF final incorpora sello visual QR y estampa digital legalmente vinculante según la Ley de Comercio Electrónico del Ecuador.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <strong>Error al firmar:</strong> {error}
          </div>
        )}
      </form>

      <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-3">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" form="sign-form" disabled={!file || !password || busy} className="bg-brand-600 hover:bg-brand-700">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Firmando digitalmente...
            </>
          ) : (
            <>
              <PenLine className="h-4 w-4" /> Estampar Firma y Descargar PDF
            </>
          )}
        </Button>
      </div>
    </Dialog>
  );
}

