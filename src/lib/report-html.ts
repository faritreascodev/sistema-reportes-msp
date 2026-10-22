import type { ReportData } from "./report-types";

/**
 * Renderizador HTML del reporte (isomórfico: lo usan la vista previa del navegador y Puppeteer).
 * Todas las medidas salen del .docx oficial (twips / EMU convertidos a mm) para que el PDF
 * coincida con el documento de Word:
 *   A4 210x297, márgenes sup 2467tw (43.52mm), izq/der 1134tw (20mm), inf 1662tw (29.32mm),
 *   encabezado a 850tw (15mm) y pie a 284tw (5.01mm).
 */

export type TemplateAssets = {
  barraSuperior: string;
  escudo: string;
  mspTitulo: string;
  ecuadorLogo: string;
  barraInferior: string;
};

export const ASSET_FILES: Record<keyof TemplateAssets, string> = {
  barraSuperior: "barra-superior.png",
  escudo: "escudo.png",
  mspTitulo: "msp-titulo.png",
  ecuadorLogo: "ecuador-logo.png",
  barraInferior: "barra-inferior.png",
};

export const publicAssets = (base = "/plantilla/"): TemplateAssets =>
  Object.fromEntries(Object.entries(ASSET_FILES).map(([k, f]) => [k, base + f])) as TemplateAssets;

export type RenderOptions = {
  assets: TemplateAssets;
  /** Devuelve la URL/data-URI de una imagen por id. */
  imageSrc: (id: string) => string | null;
  /** "screen": hojas con sombra (vista previa). "print": sin márgenes extra (PDF). */
  mode: "screen" | "print";
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ARIAL = `Arial, "Liberation Sans", Arimo, Helvetica, sans-serif`;
const CAMBRIA = `Cambria, Caladea, "Liberation Serif", "Times New Roman", serif`;
const SERIF = `"Liberation Serif", "Times New Roman", Tinos, serif`;

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: ${SERIF}; font-size: 12pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { position: relative; width: 210mm; height: 297mm; overflow: hidden; background: #fff; page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; break-after: auto; }
.abs { position: absolute; display: block; }
.hdr-text { position: absolute; top: 15mm; right: 20mm; text-align: right; font: bold 11pt/1.15 ${ARIAL}; white-space: pre; }
.ftr-text { position: absolute; top: 274.96mm; left: 20mm; font: 7pt/1.15 ${ARIAL}; color: #200096; }
.ftr-text b { font-weight: bold; }
.body { position: absolute; top: 43.52mm; left: 20mm; width: 170mm; height: 224.16mm; display: flex; flex-direction: column; }
p { margin: 0; line-height: 1.15; min-height: 1.15em; }
.title { font: bold 11pt/1.15 ${ARIAL}; text-align: center; min-height: 13.8pt; }
.blank { height: 13.8pt; flex: none; }
.blank115 { height: 15.9pt; flex: none; }
table { border-collapse: collapse; table-layout: fixed; flex: none; }
td { vertical-align: top; border: 0.5pt solid #000; }
.meta { margin-left: -11.66mm; width: 182.78mm; }
.meta td { padding: 0.97mm; }
.meta .lbl { width: 49.04mm; font: bold 12pt/1.3 ${ARIAL}; }
.meta .val { width: 133.74mm; font: 12pt/1.17 ${CAMBRIA}; text-align: center; }
.section { font: bold 11pt/1.15 ${ARIAL}; min-height: 15.9pt; flex: none; }
.registro { flex: 1 1 auto; min-height: 0; position: relative; }
.registro img { position: absolute; left: 0; top: 0; max-width: 100%; max-height: 100%; }
.fotos { margin-left: 0.97mm; width: 170.08mm; }
.fotos td { width: 50%; height: 62.71mm; padding: 0.97mm; text-align: center; vertical-align: middle; }
.fotos img { display: block; margin: 0 auto; max-width: 83.1mm; max-height: 62.8mm; }
.label12 { font: bold 12pt/1.15 ${ARIAL}; white-space: pre; flex: none; }
.resp { margin-left: -0.76mm; width: 170.6mm; font: 12pt/1.15 ${ARIAL}; }
.resp td, .coord td { padding: 0 1.9mm; }
.resp th, .coord th { border: 0.5pt solid #000; font: bold 12pt/1.15 ${ARIAL}; text-align: center; padding: 0 1.9mm; height: 4.62mm; }
.resp .data td { height: 19.47mm; }
.resp .firma, .coord .firma { position: relative; padding: 0; }
.coord { margin-left: -0.05mm; width: 170.42mm; font: 12pt/1.15 ${ARIAL}; }
.coord .data td { height: 14.6mm; }
.empty-slot { color: #9ca3af; font: 9pt ${ARIAL}; }
@media screen {
  body.screen { background: #d1d5db; padding: 16px 0; }
  body.screen .page { margin: 0 auto 16px; box-shadow: 0 2px 10px rgba(0,0,0,.25); }
}
`;

function header(a: TemplateAssets, lines: string[]) {
  return `
  <img class="abs" src="${a.barraSuperior}" style="left:89.04mm;top:3.66mm;width:100.97mm;height:3.88mm" alt="">
  <img class="abs" src="${a.escudo}" style="left:13.47mm;top:15.18mm;width:30.96mm;height:14.73mm" alt="">
  <img class="abs" src="${a.mspTitulo}" style="left:138.46mm;top:9.67mm;width:50.29mm;height:4.43mm" alt="">
  <div class="hdr-text">${lines.map((l) => `<div>${esc(l)}</div>`).join("")}</div>`;
}

function footer(a: TemplateAssets) {
  return `
  <img class="abs" src="${a.ecuadorLogo}" style="left:134.83mm;top:270.71mm;width:72.44mm;height:17.83mm" alt="">
  <img class="abs" src="${a.barraInferior}" style="left:0.53mm;top:292.2mm;width:44.34mm;height:4.41mm" alt="">
  <div class="ftr-text">
    <div>&nbsp;</div><div>&nbsp;</div>
    <div><b>Dirección: </b>Av. Colón entre Venezuela y Ecuador</div>
    <div><b>Código Postal:</b> 080110 / Esmeraldas-Ecuador</div>
    <div><b>Teléfono:</b> +593-6-2455-487</div>
    <div>www.saludzona1.gob.ec</div>
  </div>`;
}

function img(src: string | null, cls = "") {
  return src ? `<img ${cls ? `class="${cls}" ` : ""}src="${esc(src)}" alt="">` : "";
}

export function renderReportHtml(d: ReportData, opts: RenderOptions): string {
  const { assets, imageSrc, mode } = opts;
  const src = (id: string | null) => (id ? imageSrc(id) : null);
  const screen = mode === "screen";
  const placeholder = (t: string) => (screen ? `<span class="empty-slot">${t}</span>` : "");

  const metaRows: [string, string][] = [
    ["Componente: ", d.componente],
    ["Tema:", d.tema],
    ["Fecha de la Actividad:", d.fechaTexto],
    ["Lugar:", d.lugar],
    ["Hora:", d.hora],
    ["Técnica Utilizada:", d.tecnica],
  ];

  const registroSrc = src(d.registroImageId);
  const page1 = `
  <section class="page">
    ${header(assets, d.institucion)}
    <div class="body">
      <p class="title">${esc(d.encabezado)}</p>
      <div class="blank"></div>
      <table class="meta"><tbody>
        ${metaRows.map(([l, v]) => `<tr><td class="lbl">${esc(l)}</td><td class="val">${esc(v)}</td></tr>`).join("")}
      </tbody></table>
      <div class="blank115"></div>
      <p class="section">REGISTRO DE PARTICIPANTES</p>
      <div class="registro">${registroSrc ? img(registroSrc) : placeholder("Sin imagen de registro de participantes")}</div>
    </div>
    ${footer(assets)}
  </section>`;

  const fotos = d.fotoIds.map((id, i) => {
    const s = src(id);
    return `<td>${s ? img(s) : placeholder(`Foto ${i + 1}`)}</td>`;
  });

  const si = d.coordinada ? "Si X" : "Si  ";
  const no = d.coordinada ? "No" : "No X";
  const coordRows = d.coordinada ? d.coordinados : [{ nombre: "", institucion: "", cargo: "" }];

  const page2 = `
  <section class="page">
    ${header(assets, d.institucion)}
    <div class="body">
      <p class="section" style="min-height:15.9pt">REGISTRO FOTOGRÁFICO</p>
      <div class="blank"></div>
      <table class="fotos"><tbody>
        <tr>${fotos[0]}${fotos[1]}</tr>
        <tr>${fotos[2]}${fotos[3]}</tr>
      </tbody></table>
      <div class="blank"></div>
      <p class="label12">Responsable/s de la actividad (funcionarios MSP):</p>
      <div class="blank"></div>
      <table class="resp">
        <colgroup><col style="width:58.74mm"><col style="width:64.03mm"><col style="width:47.81mm"></colgroup>
        <thead><tr><th>NOMBRES Y APELLIDOS</th><th>CARGO</th><th>FIRMA</th></tr></thead>
        <tbody>
          ${d.responsables
            .map(
              (r, i) =>
                `<tr class="data"><td>${esc(r.nombres)}</td><td>${esc(r.cargo)}</td><td class="firma" data-firma-slot="${i}"></td></tr>`,
            )
            .join("")}
        </tbody>
      </table>
      <p class="label12">Actividad coordinada con otra institución:   ${si}                          ${no}</p>
      <table class="coord">
        <colgroup><col style="width:41.99mm"><col style="width:37.05mm"><col style="width:42.32mm"><col style="width:49.06mm"></colgroup>
        <thead><tr><th>NOMBRE</th><th>INSTITUCIÓN</th><th>CARGO</th><th>FIRMA</th></tr></thead>
        <tbody>
          ${coordRows
            .map((c) => `<tr class="data"><td>${esc(c.nombre)}</td><td>${esc(c.institucion)}</td><td>${esc(c.cargo)}</td><td class="firma"></td></tr>`)
            .join("")}
        </tbody>
      </table>
    </div>
    ${footer(assets)}
  </section>`;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(d.fileName)}</title><style>${CSS}</style></head>
<body class="${mode}">${page1}${page2}</body></html>`;
}
