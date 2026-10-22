"use client";

import { FileKey2, KeyRound, Loader2, PenLine, ShieldCheck } from "lucide-react";
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
  const [responsable, setResponsable] = useState(0);
  const [subFilter, setSubFilter] = useState("adbe.pkcs7.detached");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

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
      const signer = decodeURIComponent(res.headers.get("X-Signer-Name") ?? "");
      await downloadResponse(res, `${fileName}-signed.pdf`);
      setPassword("");
      onSigned?.(signer);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo firmar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={
        <span className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-brand-600" /> Firmar electrónicamente
        </span>
      }
      description="Firma PAdES/PKCS#7 con SHA-256 y RSA usando su certificado de FirmaEC, BCE, Security Data u otra EC acreditada."
    >
      <form id="sign-form" onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="cert" hint=".p12 / .pfx">
            Certificado digital
          </Label>
          <label
            htmlFor="cert"
            className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm hover:border-brand-500 hover:bg-brand-50"
          >
            <FileKey2 className="h-5 w-5 shrink-0 text-brand-600" />
            <span className="truncate">{file ? file.name : "Seleccione su archivo de firma electrónica"}</span>
          </label>
          <input id="cert" type="file" accept=".p12,.pfx,application/x-pkcs12" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <Label htmlFor="pwd">Contraseña del certificado</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-gray-400" />
            <Input id="pwd" type="password" autoComplete="off" className="pl-8" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="resp">Celda de firma</Label>
            <Select id="resp" value={responsable} onChange={(e) => setResponsable(Number(e.target.value))}>
              {responsables.map((r, i) => (
                <option key={i} value={i}>
                  {r.nombres || `Responsable ${i + 1}`}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="fmt">Formato de firma</Label>
            <Select id="fmt" value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
              <option value="adbe.pkcs7.detached">PKCS#7 detached (igual a FirmaEC)</option>
              <option value="ETSI.CAdES.detached">PAdES-B (ETSI.CAdES.detached)</option>
            </Select>
          </div>
        </div>
        <p className="flex items-start gap-2 rounded-md bg-brand-50 px-3 py-2 text-xs text-brand-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          El certificado y la contraseña sólo se usan en memoria para esta firma; no se guardan. Se agrega la estampa con código QR en la celda
          FIRMA y la firma criptográfica verificable en FirmaEC y Adobe Acrobat Reader.
        </p>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </form>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" form="sign-form" disabled={!file || !password || busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          Firmar y descargar
        </Button>
      </div>
    </Dialog>
  );
}
