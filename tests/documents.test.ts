/**
 * Integración: exige la base sembrada (npm run setup / npm run db:seed).
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";
import PizZip from "pizzip";
import { prisma } from "../src/lib/server/db";
import { buildReportDocx } from "../src/lib/server/docx";
import { closePdfBrowser, renderReportPdf } from "../src/lib/server/pdf";
import { getReport, listReports } from "../src/lib/server/reports";

describe("exportación DOCX y PDF", async () => {
  const [first] = await listReports({ q: "METODOLOG" });
  assert.ok(first, "Ejecute npm run db:seed antes de los tests");
  const { data } = await getReport(first.id);
  after(async () => {
    await closePdfBrowser();
    await prisma.$disconnect();
  });

  it("genera un .docx con la plantilla oficial, el membrete y las 5 imágenes", async () => {
    const zip = new PizZip(await buildReportDocx(data));
    const doc = zip.file("word/document.xml")!.asText();
    const header = zip.file("word/header1.xml")!.asText();
    assert.ok(!doc.includes("{{BODY}}"));
    assert.ok(doc.includes("REPORTE DE VERIFICABLE DE ACTIVIDADES DE PROMOCIÓN"));
    assert.ok(doc.includes(data.tema));
    assert.ok(doc.includes("08 DE SEPTIEMBRE DE 2026"));
    assert.ok(doc.includes("ING. MARÍA DE LAS MERCEDES TORRES ESCOBAR"));
    assert.ok(doc.includes("<w:pageBreakBefore/>"));
    assert.equal(doc.match(/<w:drawing>/g)?.length, 5);
    assert.ok(header.includes("Dirección Provincial de Salud Esmeraldas"));
    assert.ok(!header.includes("{{INST_"));
    assert.equal(zip.file(/word\/media\/reporte-/).length, 5);
  });

  it("genera un PDF A4 de 2 páginas con la celda de firma en la página 2", async () => {
    const { pdf, slots } = await renderReportPdf(data);
    const doc = await PDFDocument.load(pdf);
    assert.equal(doc.getPageCount(), 2);
    const { width, height } = doc.getPage(0).getSize();
    assert.ok(Math.abs(width - 595.28) < 1 && Math.abs(height - 841.89) < 1);
    assert.equal(slots.length, 1);
    assert.equal(slots[0].page, 1);
    assert.ok(slots[0].x > 350 && slots[0].width > 120 && slots[0].height > 40);
  });
});
