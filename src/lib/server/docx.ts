import fs from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import type { ReportData } from "../report-types";
import { loadImages, type LoadedImage } from "./images";

/**
 * Genera el .docx a partir de la plantilla oficial (templates/plantilla-promocion.docx, creada con
 * scripts/prepare-template.ts). Encabezado, pie, estilos y fuentes son los del documento original;
 * aquí sólo se escribe <w:body> replicando la estructura de tablas, anchos (twips) y tipografías.
 */

const TEMPLATE = path.join(process.cwd(), "templates", "plantilla-promocion.docx");
const EMU_PER_MM = 36000;

const xmlEsc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- Bloques XML ---------------------------------------------------------------

const ARIAL = `<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>`;
const BLACK = `<w:color w:val="000000"/>`;
const BORDER_THIN = (sides: string[], sz = 1, theme = true) =>
  `<w:tcBorders>${sides
    .map((s) => `<w:${s} w:val="single" w:sz="${sz}" w:space="0" w:color="000000"${theme ? ` w:themeColor="text1"` : ""}/>`)
    .join("")}</w:tcBorders>`;

function run(text: string, rPr: string) {
  return `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`;
}

function para(content: string, pPr = "") {
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${content}</w:p>`;
}

const SPACING_115 = `<w:spacing w:line="276" w:lineRule="auto"/>`;
const NORMAL_WEB = `<w:pStyle w:val="NormalWeb"/><w:spacing w:before="0" w:after="0"/>`;
const emptyArialPara = () => para("", `${NORMAL_WEB}<w:rPr>${ARIAL}${BLACK}</w:rPr>`);

function cell(width: number, borders: string, content: string, extraTcPr = "") {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${borders}${extraTcPr}</w:tcPr>${content}</w:tc>`;
}

function table(opts: { indent: number; grid: number[]; width?: number; cellMar?: boolean }, rows: string[]) {
  const tblW = opts.width ? `<w:tblW w:w="${opts.width}" w:type="dxa"/>` : `<w:tblW w:w="0" w:type="auto"/>`;
  const mar = opts.cellMar
    ? `<w:tblCellMar><w:top w:w="55" w:type="dxa"/><w:left w:w="55" w:type="dxa"/><w:bottom w:w="55" w:type="dxa"/><w:right w:w="55" w:type="dxa"/></w:tblCellMar>`
    : "";
  return (
    `<w:tbl><w:tblPr>${tblW}<w:tblInd w:w="${opts.indent}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${mar}` +
    `<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/></w:tblPr>` +
    `<w:tblGrid>${opts.grid.map((g) => `<w:gridCol w:w="${g}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`
  );
}

const row = (cells: string[], height?: number) =>
  `<w:tr>${height ? `<w:trPr><w:trHeight w:val="${height}"/></w:trPr>` : ""}${cells.join("")}</w:tr>`;

type DocImage = { rid: string; cx: number; cy: number; docPrId: number; name: string };

function drawing(im: DocImage) {
  return (
    `<w:r><w:rPr><w:noProof/>${BLACK}</w:rPr><w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${im.cx}" cy="${im.cy}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${im.docPrId}" name="Picture ${im.docPrId}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${im.docPrId}" name="${im.name}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${im.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${im.cx}" cy="${im.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
  );
}

/** Escala (w,h) para caber en (maxW,maxH) mm conservando proporción; devuelve EMU. */
function fit(width: number, height: number, maxWmm: number, maxHmm: number) {
  const scale = Math.min(maxWmm / width, maxHmm / height);
  return { cx: Math.round(width * scale * EMU_PER_MM), cy: Math.round(height * scale * EMU_PER_MM) };
}

/** Altura disponible (mm) para la hoja de registro en la página 1, estimando el alto de la tabla. */
function registroMaxHeight(d: ReportData) {
  const values = [d.componente, d.tema, d.fechaTexto, d.lugar, d.hora, d.tecnica];
  const lines = values.reduce((acc, v) => acc + Math.max(1, Math.ceil(v.length / 58)), 0);
  const tableMm = lines * 5.6 + values.length * 2.2;
  const used = 4.9 + 4.9 + tableMm + 5.6 + 5.6 + 6; // título, vacíos, sección y margen de seguridad
  return Math.max(60, Math.min(150, 224 - used));
}

// ---- Documento -------------------------------------------------------------------

export async function buildReportDocx(d: ReportData): Promise<Buffer> {
  const zip = new PizZip(await fs.readFile(TEMPLATE));
  const images = await loadImages([d.registroImageId, ...d.fotoIds]);

  let relsXml = zip.file("word/_rels/document.xml.rels")!.asText();
  let docPr = 100;
  let ridN = 1000;
  const addImage = (im: LoadedImage, maxW: number, maxH: number): DocImage => {
    const rid = `rIdImg${ridN++}`;
    const name = `reporte-${rid}.jpeg`;
    zip.file(`word/media/${name}`, im.data);
    relsXml = relsXml.replace(
      "</Relationships>",
      `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/></Relationships>`,
    );
    return { rid, name, docPrId: docPr++, ...fit(im.width, im.height, maxW, maxH) };
  };

  const body: string[] = [];

  // Título
  body.push(para(run(d.encabezado, `${ARIAL}<w:b/><w:bCs/>${BLACK}<w:sz w:val="22"/><w:szCs w:val="22"/>`), `<w:jc w:val="center"/>`));
  body.push(para("", `<w:jc w:val="center"/><w:rPr>${BLACK}</w:rPr>`));

  // Tabla de metadatos (2 columnas)
  const meta: [string, string][] = [
    ["Componente: ", d.componente],
    ["Tema:", d.tema],
    ["Fecha de la Actividad:", d.fechaTexto],
    ["Lugar:", d.lugar],
    ["Hora:", d.hora],
    ["Técnica Utilizada:", d.tecnica],
  ];
  body.push(
    table(
      { indent: -661, grid: [2780, 7581], cellMar: true },
      meta.map(([label, value], i) => {
        const top = i === 0 ? ["top"] : [];
        return row([
          cell(2780, BORDER_THIN([...top, "left", "bottom"]), para(run(label, `${ARIAL}<w:b/><w:bCs/>${BLACK}`), SPACING_115)),
          cell(
            7581,
            BORDER_THIN([...top, "left", "bottom", "right"]),
            para(run(value, `<w:color w:val="000000" w:themeColor="text1"/>`), `<w:pStyle w:val="Contenidodelatabla"/><w:jc w:val="center"/>`),
          ),
        ]);
      }),
    ),
  );
  body.push(para("", `${SPACING_115}<w:rPr>${BLACK}</w:rPr>`));

  // Registro de participantes
  body.push(para(run("REGISTRO DE PARTICIPANTES", `${ARIAL}<w:b/><w:bCs/>${BLACK}<w:sz w:val="22"/><w:szCs w:val="22"/>`), SPACING_115));
  const registro = d.registroImageId ? images.get(d.registroImageId) : undefined;
  body.push(para(registro ? drawing(addImage(registro, 170, registroMaxHeight(d))) : "", `${SPACING_115}<w:rPr>${BLACK}</w:rPr>`));

  // Página 2: registro fotográfico
  body.push(
    para(
      run("REGISTRO FOTOGRÁFICO", `${ARIAL}<w:b/><w:bCs/>${BLACK}<w:sz w:val="22"/><w:szCs w:val="22"/>`),
      `<w:pageBreakBefore/>${SPACING_115}`,
    ),
  );
  body.push(para("", `<w:rPr>${BLACK}</w:rPr>`));
  const fotoCell = (idx: number, width: number, borders: string) => {
    const id = d.fotoIds[idx];
    const im = id ? images.get(id) : undefined;
    return cell(
      width,
      borders,
      para(im ? drawing(addImage(im, 83.1, 62.8)) : "", `<w:pStyle w:val="Contenidodelatabla"/><w:jc w:val="center"/><w:rPr>${BLACK}</w:rPr>`),
      `<w:vAlign w:val="center"/>`,
    );
  };
  body.push(
    table({ indent: 55, grid: [4815, 4827], width: 9642, cellMar: true }, [
      row([fotoCell(0, 4815, BORDER_THIN(["top", "left", "bottom"])), fotoCell(1, 4827, BORDER_THIN(["top", "left", "bottom", "right"]))], 3555),
      row([fotoCell(2, 4815, BORDER_THIN(["left", "bottom"])), fotoCell(3, 4827, BORDER_THIN(["left", "bottom", "right"]))], 3555),
    ]),
  );
  body.push(para("", `<w:rPr>${BLACK}</w:rPr>`));

  // Responsables
  body.push(para(run("Responsable/s de la actividad (funcionarios MSP):", `${ARIAL}<w:b/>${BLACK}`), NORMAL_WEB));
  body.push(para("", `${NORMAL_WEB}<w:rPr>${ARIAL}<w:b/>${BLACK}</w:rPr>`));
  const headCell = (w: number, text: string, sides: string[], theme = true) =>
    cell(w, BORDER_THIN(sides, 4, theme), para(run(text, `${ARIAL}<w:b/><w:bCs/>${BLACK}`), `${NORMAL_WEB}<w:jc w:val="center"/>`));
  const textCell = (w: number, text: string, sides: string[], theme = true) =>
    cell(
      w,
      BORDER_THIN(sides, 4, theme),
      text ? para(run(text, `${ARIAL}<w:color w:val="000000" w:themeColor="text1"/>`), `${NORMAL_WEB}<w:rPr>${ARIAL}${BLACK}</w:rPr>`) : emptyArialPara(),
    );
  const firmaCell = (w: number, lines: number, theme = true) =>
    cell(w, BORDER_THIN(["top", "left", "bottom", "right"], 4, theme), Array.from({ length: lines }, emptyArialPara).join(""));
  body.push(
    table({ indent: -43, grid: [3330, 3630, 2710] }, [
      row(
        [
          headCell(3330, "NOMBRES Y APELLIDOS", ["top", "left", "bottom"]),
          headCell(3630, "CARGO", ["top", "left", "bottom"]),
          headCell(2710, "FIRMA", ["top", "left", "bottom", "right"]),
        ],
        262,
      ),
      ...d.responsables.map((r) =>
        row([textCell(3330, r.nombres, ["top", "left", "bottom"]), textCell(3630, r.cargo, ["top", "left", "bottom"]), firmaCell(2710, 4)], 593),
      ),
    ]),
  );

  // Actividad coordinada
  const si = d.coordinada ? "Si X" : "Si";
  const no = d.coordinada ? "No" : "No X";
  body.push(para(run(`Actividad coordinada con otra institución:   ${si}                          ${no}`, `${ARIAL}<w:b/>${BLACK}`), NORMAL_WEB));
  const coordRows = d.coordinada ? d.coordinados : [{ nombre: "", institucion: "", cargo: "" }];
  body.push(
    table({ indent: -3, grid: [2380, 2100, 2399, 2781] }, [
      row(
        [
          headCell(2380, "NOMBRE", ["top", "left", "bottom"], false),
          headCell(2100, "INSTITUCIÓN", ["top", "left", "bottom"], false),
          headCell(2399, "CARGO", ["top", "left", "bottom"], false),
          headCell(2781, "FIRMA", ["top", "left", "bottom", "right"], false),
        ],
        278,
      ),
      ...coordRows.map((c) =>
        row(
          [
            textCell(2380, c.nombre, ["top", "left", "bottom"], false),
            textCell(2100, c.institucion, ["top", "left", "bottom"], false),
            textCell(2399, c.cargo, ["top", "left", "bottom"], false),
            firmaCell(2781, 3, false),
          ],
          278,
        ),
      ),
    ]),
  );
  body.push(para("", `<w:tabs><w:tab w:val="left" w:pos="3390"/></w:tabs><w:spacing w:after="160"/>`));

  // Ensamblar
  const docXml = zip.file("word/document.xml")!.asText().replace("{{BODY}}", () => body.join(""));
  zip.file("word/document.xml", docXml);
  zip.file("word/_rels/document.xml.rels", relsXml);

  let header = zip.file("word/header1.xml")!.asText();
  d.institucion.forEach((line, i) => {
    header = header.replace(`{{INST_${i + 1}}}`, () => xmlEsc(line));
  });
  zip.file("word/header1.xml", header);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const core =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${xmlEsc(d.fileName)}</dc:title><dc:subject>${xmlEsc(d.componente)}</dc:subject><dc:creator>${xmlEsc(d.responsables[0]?.nombres ?? "")}</dc:creator>` +
    `<cp:lastModifiedBy>Sistema de Reportes MSP</cp:lastModifiedBy><cp:revision>1</cp:revision>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  zip.file("docProps/core.xml", core);

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}
