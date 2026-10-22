"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { publicAssets, renderReportHtml } from "@/lib/report-html";
import type { ReportData } from "@/lib/report-types";

// 210mm a 96 dpi + márgenes del modo pantalla; 2 hojas de 297mm con separación.
const DOC_W = 830;
const DOC_H = Math.ceil(2 * 1122.52 + 16 * 3);

/** Vista previa en vivo: el mismo HTML que Puppeteer convierte a PDF, escalado al panel. */
export function PreviewFrame({ data }: { data: ReportData }) {
  const deferred = useDeferredValue(data);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);

  const html = useMemo(
    () =>
      renderReportHtml(deferred, {
        assets: publicAssets(),
        imageSrc: (id) => `/api/imagenes/${id}`,
        mode: "screen",
      }),
    [deferred],
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1.2, e.contentRect.width / DOC_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="w-full overflow-hidden rounded-lg bg-gray-300" style={{ height: DOC_H * scale }}>
      <iframe
        title="Vista previa del reporte"
        srcDoc={html}
        sandbox="allow-same-origin"
        style={{ width: DOC_W, height: DOC_H, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0, display: "block" }}
      />
    </div>
  );
}
