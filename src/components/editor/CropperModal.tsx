"use client";

import "cropperjs/dist/cropper.css";
import { Check, FlipHorizontal2, Loader2, RotateCcw, RotateCw, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useRef, useState } from "react";
import Cropper, { type ReactCropperElement } from "react-cropper";
import { Button, Dialog, Label, Select } from "@/components/ui";
import { cn } from "@/lib/utils";

export type CropResult = { blob: Blob; quality: number; maxSize: number };

const ASPECTS: { label: string; value: number }[] = [
  { label: "Libre", value: NaN },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
  { label: "1:1", value: 1 },
];

/**
 * Recorte interactivo (Cropper.js): bordes, rotación, volteo, zoom, relación de aspecto,
 * calidad JPEG y resolución máxima para optimizar el peso final del documento.
 */
export function CropperModal({
  open,
  src,
  title,
  defaultAspect,
  onApply,
  onUseOriginal,
  onClose,
}: {
  open: boolean;
  src: string | null;
  title: string;
  defaultAspect: number;
  onApply: (r: CropResult) => Promise<void>;
  onUseOriginal: () => void;
  onClose: () => void;
}) {
  const ref = useRef<ReactCropperElement>(null);
  const [aspect, setAspect] = useState(defaultAspect);
  const [quality, setQuality] = useState(82);
  const [maxSize, setMaxSize] = useState(1800);
  const [flipX, setFlipX] = useState(1);
  const [busy, setBusy] = useState(false);
  const cropper = () => ref.current?.cropper;

  function changeAspect(v: number) {
    setAspect(v);
    cropper()?.setAspectRatio(v);
  }

  async function apply() {
    const c = cropper();
    if (!c) return;
    setBusy(true);
    try {
      const canvas = c.getCroppedCanvas({ maxWidth: maxSize, maxHeight: maxSize, fillColor: "#fff", imageSmoothingEnabled: true, imageSmoothingQuality: "high" });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality / 100));
      if (!blob) throw new Error("No se pudo generar el recorte");
      await onApply({ blob, quality, maxSize });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={busy ? () => undefined : onClose} title={`Recortar · ${title}`} className="w-[min(1100px,calc(100vw-2rem))]">
      {src && (
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <div className="h-[min(62vh,620px)] overflow-hidden rounded-md bg-gray-800">
            <Cropper
              ref={ref}
              src={src}
              style={{ height: "100%", width: "100%" }}
              initialAspectRatio={defaultAspect}
              aspectRatio={defaultAspect}
              viewMode={1}
              autoCropArea={1}
              guides
              background={false}
              responsive
              checkOrientation={false}
              dragMode="move"
              toggleDragModeOnDblclick
            />
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <Label>Relación de aspecto</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {ASPECTS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => changeAspect(a.value)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs font-medium",
                      (Number.isNaN(a.value) && Number.isNaN(aspect)) || a.value === aspect
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-gray-200 hover:bg-gray-50",
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Transformar</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button size="icon" variant="outline" title="Rotar a la izquierda" onClick={() => cropper()?.rotate(-90)}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" title="Rotar a la derecha" onClick={() => cropper()?.rotate(90)}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  title="Voltear horizontal"
                  onClick={() => {
                    const n = -flipX;
                    setFlipX(n);
                    cropper()?.scaleX(n);
                  }}
                >
                  <FlipHorizontal2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" title="Acercar" onClick={() => cropper()?.zoom(0.1)}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" title="Alejar" onClick={() => cropper()?.zoom(-0.1)}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" title="Restablecer" onClick={() => cropper()?.reset()}>
                  <Undo2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2">
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={0.5}
                  defaultValue={0}
                  className="w-full accent-brand-600"
                  onChange={(e) => cropper()?.rotateTo(Number(e.target.value))}
                  aria-label="Enderezar"
                />
                <div className="text-[11px] text-gray-500">Enderezar (±45°)</div>
              </div>
            </div>
            <div>
              <Label hint={`${quality}%`}>Calidad JPEG</Label>
              <input type="range" min={50} max={95} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-brand-600" />
              <div className="text-[11px] text-gray-500">Menor calidad = archivo más liviano</div>
            </div>
            <div>
              <Label htmlFor="maxsize">Resolución máxima</Label>
              <Select id="maxsize" value={maxSize} onChange={(e) => setMaxSize(Number(e.target.value))}>
                <option value={1200}>1200 px (liviano)</option>
                <option value={1800}>1800 px (recomendado)</option>
                <option value={2400}>2400 px (alta)</option>
                <option value={3200}>3200 px (máxima)</option>
              </Select>
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="outline" onClick={onUseOriginal} disabled={busy}>
          Usar sin recortar
        </Button>
        <Button onClick={apply} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Aplicar recorte
        </Button>
      </div>
    </Dialog>
  );
}
