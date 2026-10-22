import fs from "node:fs/promises";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import { ASSET_FILES, renderReportHtml, type TemplateAssets } from "../report-html";
import type { ReportData } from "../report-types";
import { pdfRenderBulkhead } from "./bulkhead";
import { loadImages } from "./images";

/** Rectángulo de una celda FIRMA en coordenadas PDF (puntos, origen abajo-izquierda). */
export type SignatureSlot = { index: number; page: number; x: number; y: number; width: number; height: number };

const PAGE_W_PT = 595.28; // A4 en puntos
const PAGE_H_PT = 841.89;
const PX_TO_PT = 0.75; // 96 dpi CSS -> 72 dpi PDF
const PAGE_H_PX = PAGE_H_PT / PX_TO_PT;

const globalForBrowser = globalThis as unknown as { pdfBrowser?: Promise<Browser> };

function getBrowser(): Promise<Browser> {
  if (!globalForBrowser.pdfBrowser) {
    globalForBrowser.pdfBrowser = puppeteer
      .launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
      })
      .then((b) => {
        b.on("disconnected", () => (globalForBrowser.pdfBrowser = undefined));
        return b;
      })
      .catch((e) => {
        globalForBrowser.pdfBrowser = undefined;
        throw e;
      });
  }
  return globalForBrowser.pdfBrowser;
}

/** Cierra el Chromium compartido (scripts y tests; el servidor lo mantiene abierto). */
export async function closePdfBrowser() {
  const b = globalForBrowser.pdfBrowser;
  globalForBrowser.pdfBrowser = undefined;
  if (b) await (await b).close().catch(() => undefined);
}

let cachedAssets: TemplateAssets | null = null;
async function inlineAssets(): Promise<TemplateAssets> {
  if (cachedAssets) return cachedAssets;
  const dir = path.join(process.cwd(), "public", "plantilla");
  const entries = await Promise.all(
    Object.entries(ASSET_FILES).map(async ([k, f]) => [k, `data:image/png;base64,${(await fs.readFile(path.join(dir, f))).toString("base64")}`]),
  );
  cachedAssets = Object.fromEntries(entries) as TemplateAssets;
  return cachedAssets;
}

export async function renderReportPdf(data: ReportData): Promise<{ pdf: Buffer; slots: SignatureSlot[] }> {
  const releaseBulkhead = await pdfRenderBulkhead.acquire();
  try {
    const images = await loadImages([data.registroImageId, ...data.fotoIds]);
    const html = renderReportHtml(data, {
      assets: await inlineAssets(),
      imageSrc: (id) => {
        const im = images.get(id);
        return im ? `data:${im.mime};base64,${im.data.toString("base64")}` : null;
      },
      mode: "print",
    });

    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.emulateMediaType("print");
      await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
      await page.evaluate(() => document.fonts.ready);
      const rects = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("[data-firma-slot]")].map((el) => {
          const r = el.getBoundingClientRect();
          return { index: Number(el.dataset.firmaSlot), x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
        }),
      );
      const pdf = Buffer.from(
        await page.pdf({ format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true }),
      );
      const slots = rects.map((r) => {
        const pageIndex = Math.floor(r.y / PAGE_H_PX);
        const topInPage = r.y - pageIndex * PAGE_H_PX;
        return {
          index: r.index,
          page: pageIndex,
          x: r.x * PX_TO_PT,
          y: PAGE_H_PT - (topInPage + r.h) * PX_TO_PT,
          width: Math.min(r.w * PX_TO_PT, PAGE_W_PT),
          height: r.h * PX_TO_PT,
        };
      });
      return { pdf, slots };
    } finally {
      await page.close().catch(() => undefined);
    }
  } finally {
    releaseBulkhead();
  }
}
