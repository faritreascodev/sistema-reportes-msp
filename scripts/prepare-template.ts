/**
 * Convierte un reporte .docx oficial del MSP en la plantilla base del sistema.
 *
 *   npx tsx scripts/prepare-template.ts "<ruta al reporte de ejemplo>.docx"
 *
 * - Conserva estilos, fuentes, tema, encabezado y pie de página (con sus imágenes ancladas).
 * - Elimina las imágenes del cuerpo y deja <w:body> listo para generarse en runtime.
 * - Reemplaza las 4 líneas del membrete por marcadores {{INST_1}}..{{INST_4}}.
 * - Extrae los logos del membrete a public/plantilla (para la vista previa / PDF)
 *   y las fotos del cuerpo a prisma/seed-assets (para los datos de prueba).
 */
import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";

const source = process.argv[2];
if (!source) {
  console.error("Uso: tsx scripts/prepare-template.ts <reporte.docx>");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");
const zip = new PizZip(fs.readFileSync(source));
const read = (p: string) => zip.file(p)?.asText() ?? "";

function relTargets(relsPath: string) {
  const map: Record<string, { type: string; target: string }> = {};
  for (const m of read(relsPath).matchAll(/<Relationship Id="([^"]+)" Type="[^"]*\/([^"/]+)" Target="([^"]+)"\/>/g)) {
    map[m[1]] = { type: m[2], target: m[3] };
  }
  return map;
}

// 1. Logos del membrete y pie --------------------------------------------------
const publicDir = path.join(root, "public", "plantilla");
fs.mkdirSync(publicDir, { recursive: true });
const headerRels = relTargets("word/_rels/header1.xml.rels");
const footerRels = relTargets("word/_rels/footer1.xml.rels");
const headerXml = read("word/header1.xml");
const footerXml = read("word/footer1.xml");

// Orden de aparición de las imágenes ancladas en header1/footer1 del formato 2026.
const embeds = (xml: string) => [...xml.matchAll(/<a:blip r:embed="([^"]+)"/g)].map((m) => m[1]);
const headerNames = ["barra-superior.png", "escudo.png", "msp-titulo.png"];
const footerNames = ["ecuador-logo.png", "barra-inferior.png"];
embeds(headerXml).forEach((rid, i) => {
  if (!headerNames[i]) return;
  fs.writeFileSync(path.join(publicDir, headerNames[i]), zip.file("word/" + headerRels[rid].target)!.asNodeBuffer());
});
embeds(footerXml).forEach((rid, i) => {
  if (!footerNames[i]) return;
  fs.writeFileSync(path.join(publicDir, footerNames[i]), zip.file("word/" + footerRels[rid].target)!.asNodeBuffer());
});

// 2. Imágenes del cuerpo -> seed-assets y fuera de la plantilla ----------------
const seedDir = path.join(root, "prisma", "seed-assets");
fs.mkdirSync(seedDir, { recursive: true });
const docRelsPath = "word/_rels/document.xml.rels";
const docRels = relTargets(docRelsPath);
const docXml = read("word/document.xml");
const bodyImages = embeds(docXml);
bodyImages.forEach((rid, i) => {
  const target = docRels[rid].target;
  const ext = path.extname(target);
  const name = i === 0 ? `registro-participantes${ext}` : `foto-${i}${ext}`;
  fs.writeFileSync(path.join(seedDir, name), zip.file("word/" + target)!.asNodeBuffer());
});
let rels = read(docRelsPath);
for (const [rid, rel] of Object.entries(docRels)) {
  if (rel.type !== "image") continue;
  zip.remove("word/" + rel.target);
  rels = rels.replace(new RegExp(`<Relationship Id="${rid}"[^>]*/>`), "");
}
zip.file(docRelsPath, rels);

// 3. Cuerpo vacío con marcador, conservando sectPr ------------------------------
const sectPr = docXml.match(/<w:sectPr[\s\S]*<\/w:sectPr>/)![0];
const newDoc = docXml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>{{BODY}}${sectPr}</w:body>`);
zip.file("word/document.xml", newDoc);

// 4. Membrete editable -----------------------------------------------------------
let n = 0;
const newHeader = headerXml.replace(/(<w:t(?: [^>]*)?>)([^<]+)(<\/w:t>)/g, (_all, open, _text, close) => {
  n += 1;
  return `${open}{{INST_${n}}}${close}`;
});
zip.file("word/header1.xml", newHeader);

// 5. Metadatos limpios ----------------------------------------------------------
zip.remove("docProps/custom.xml");
const ct = read("[Content_Types].xml").replace(/<Override PartName="\/docProps\/custom.xml"[^>]*\/>/, "");
zip.file("[Content_Types].xml", ct);

const outDir = path.join(root, "templates");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "plantilla-promocion.docx"), zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
console.log(`Plantilla generada. Membrete: ${n} líneas. Imágenes de cuerpo extraídas: ${bodyImages.length}`);
