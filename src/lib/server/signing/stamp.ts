import QRCode from "qrcode";
import { rgb, StandardFonts, type PDFDocument, type PDFFont, type PDFPage } from "pdf-lib";
import { isoConZona } from "../../fechas";
import type { CertificateInfo } from "./p12";

export type StampRect = { x: number; y: number; width: number; height: number };

/**
 * Estampa visual con el mismo diseño que usa FirmaEC en los reportes firmados:
 * código QR a la izquierda y, a la derecha, "Validar únicamente en FirmaEC",
 * "Firmado electrónicamente por:" y el nombre del titular en negrita monoespaciada.
 */
export function qrText(info: CertificateInfo, signedAt: Date, reason: string, location: string) {
  return [
    `FIRMADO POR: ${info.commonName}`,
    `RAZON: ${reason}`,
    `LOCALIZACION: ${location}`,
    `FECHA: ${isoConZona(signedAt)}`,
    `VALIDAR CON: www.firmadigital.gob.ec`,
    `Firmado digitalmente con Sistema de Reportes MSP`,
  ].join("\n");
}

/** Texto apto para las fuentes estándar (WinAnsi): reemplaza lo que no se pueda codificar. */
function winAnsi(font: PDFFont, s: string) {
  return [...s].map((ch) => {
    try {
      font.encodeText(ch);
      return ch;
    } catch {
      return ch.normalize("NFD").replace(/[̀-ͯ]/g, "") || "?";
    }
  }).join("");
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawSignatureStamp(
  pdfDoc: PDFDocument,
  page: PDFPage,
  cell: StampRect,
  info: CertificateInfo,
  signedAt: Date,
  reason: string,
  location: string,
): Promise<StampRect> {
  const pad = 4;
  const qrSize = Math.min(cell.height - pad * 2, 38);
  const rect: StampRect = {
    x: cell.x + pad,
    y: cell.y + (cell.height - qrSize) / 2,
    width: cell.width - pad * 2,
    height: qrSize,
  };

  const png = await QRCode.toBuffer(qrText(info, signedAt, reason, location), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 0,
    width: 300,
  });
  const qr = await pdfDoc.embedPng(png);
  page.drawImage(qr, { x: rect.x, y: rect.y, width: qrSize, height: qrSize });

  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const textX = rect.x + qrSize + 1;
  const textW = cell.x + cell.width - pad - textX;

  const small = 3.9;
  const nameLines = (size: number) => wrap(courierBold, winAnsi(courierBold, info.commonName.toUpperCase()), size, textW);
  let nameSize = 6.2;
  while (nameSize > 4 && nameLines(nameSize).length * nameSize * 0.95 + small * 2.4 > qrSize) nameSize -= 0.2;
  const lines = nameLines(nameSize);

  const block = small * 1.2 * 2 + lines.length * nameSize * 0.95;
  let y = rect.y + qrSize / 2 + block / 2 - small;
  const dark = rgb(0, 0, 0);
  page.drawText(winAnsi(courier, "Validar únicamente en FirmaEC."), { x: textX, y, size: small, font: courier, color: dark });
  y -= small * 1.2;
  page.drawText(winAnsi(courier, "Firmado electrónicamente por:"), { x: textX, y, size: small, font: courier, color: dark });
  y -= nameSize * 0.95;
  for (const l of lines) {
    page.drawText(l, { x: textX, y, size: nameSize, font: courierBold, color: dark });
    y -= nameSize * 0.95;
  }
  return rect;
}
