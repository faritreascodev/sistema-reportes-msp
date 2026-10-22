"use client";

import { Crop, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { apiJson, cn, formatBytes } from "@/lib/utils";
import { CropperModal, type CropResult } from "./CropperModal";

type Meta = { id: string; width: number; height: number; size: number; sourceId: string | null };

async function upload(file: Blob, name: string, extra: Record<string, string> = {}): Promise<Meta> {
  const form = new FormData();
  form.set("file", file, name);
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  return apiJson<Meta>("/api/imagenes", { method: "POST", body: form });
}

/**
 * Casilla de imagen: arrastrar/soltar o seleccionar, recortar (abre el cropper al subir),
 * re-recortar desde la imagen original, reemplazar o quitar.
 */
export function ImageSlot({
  label,
  imageId,
  onChange,
  aspect,
  className,
  onError,
}: {
  label: string;
  imageId: string | null;
  onChange: (id: string | null) => void;
  aspect: number;
  className?: string;
  onError: (msg: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId) return setMeta(null);
    if (meta?.id === imageId) return;
    apiJson<Meta>(`/api/imagenes/${imageId}?meta=1`).then(setMeta).catch(() => setMeta(null));
  }, [imageId, meta?.id]);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return onError("Seleccione un archivo de imagen");
    setBusy(true);
    try {
      // Original en alta resolución: sirve de fuente para recortar ahora y re-recortar después.
      const original = await upload(file, file.name, { maxSize: "4000", quality: "92" });
      setCropSource(original.id);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openCrop() {
    if (!imageId) return;
    const m = meta ?? (await apiJson<Meta>(`/api/imagenes/${imageId}?meta=1`));
    setCropSource(m.sourceId ?? m.id);
  }

  async function applyCrop(r: CropResult) {
    if (!cropSource) return;
    try {
      const cropped = await upload(r.blob, "recorte.jpg", { sourceId: cropSource, quality: String(r.quality), maxSize: String(r.maxSize) });
      setMeta(cropped);
      onChange(cropped.id);
      setCropSource(null);
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        {meta && (
          <span className="text-[11px] text-gray-400">
            {meta.width}×{meta.height} · {formatBytes(meta.size)}
          </span>
        )}
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={cn(
          "group relative flex flex-1 items-center justify-center overflow-hidden rounded-md border bg-gray-50",
          imageId ? "border-gray-200" : "border-dashed border-gray-300",
          drag && "border-brand-500 bg-brand-50",
        )}
        style={{ aspectRatio: Number.isNaN(aspect) ? "16 / 10" : String(aspect) }}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
        ) : imageId ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/imagenes/${imageId}`} alt={label} className="max-h-full max-w-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Button size="sm" variant="secondary" onClick={openCrop}>
                <Crop className="h-3.5 w-3.5" /> Recortar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
                <RefreshCw className="h-3.5 w-3.5" /> Reemplazar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onChange(null)} aria-label="Quitar imagen">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-brand-700">
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs font-medium">Arrastre o seleccione una imagen</span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <CropperModal
        key={cropSource ?? "none"}
        open={!!cropSource}
        src={cropSource ? `/api/imagenes/${cropSource}` : null}
        title={label}
        defaultAspect={aspect}
        onClose={() => setCropSource(null)}
        onUseOriginal={() => {
          if (cropSource) onChange(cropSource);
          setCropSource(null);
        }}
        onApply={applyCrop}
      />
    </div>
  );
}
