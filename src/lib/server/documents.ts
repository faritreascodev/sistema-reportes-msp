import crypto from "node:crypto";
import { prisma } from "./db";
import { buildReportDocx } from "./docx";
import { renderReportPdf } from "./pdf";
import { getReport, getVersion } from "./reports";
import { signPdf } from "./signing/sign-pdf";
import { writeStorage } from "./storage";
import type { ReportData } from "../report-types";

/** Datos del reporte en su versión actual o en una versión histórica. */
export async function resolveReportData(id: string, version?: string | null): Promise<{ data: ReportData; version: number }> {
  const current = await getReport(id);
  const v = version ? Number(version) : NaN;
  if (Number.isInteger(v) && v > 0 && v !== current.version) return { data: await getVersion(id, v), version: v };
  return { data: current.data, version: current.version };
}

export const exportDocx = (data: ReportData) => buildReportDocx(data);
export const exportPdf = async (data: ReportData) => (await renderReportPdf(data)).pdf;

export type SignRequest = {
  reportId: string;
  version?: string | null;
  certificate: Buffer;
  password: string;
  responsableIndex: number;
  subFilter?: string;
};

/** Genera el PDF de la versión pedida, lo firma en la celda del responsable y guarda el resultado. */
export async function signReport(req: SignRequest) {
  const { data, version } = await resolveReportData(req.reportId, req.version);
  const { pdf, slots } = await renderReportPdf(data);
  const slot = slots.find((s) => s.index === req.responsableIndex) ?? slots[0];
  if (!slot) throw new Error("El reporte no tiene celdas de firma");

  const result = await signPdf(pdf, req.certificate, req.password, { slot, subFilter: req.subFilter });
  const id = crypto.randomUUID();
  const pdfPath = await writeStorage(`signed/${req.reportId}/${id}.pdf`, result.pdf);
  await prisma.signature.create({
    data: {
      id,
      reportId: req.reportId,
      reportVersion: version,
      signerName: result.info.commonName,
      signerId: result.info.signerId,
      issuer: result.info.issuer,
      serialNumber: result.info.serialNumber,
      fingerprint: result.info.fingerprint,
      subFilter: result.subFilter,
      signedAt: result.signedAt,
      pdfPath,
      sha256: result.sha256,
    },
  });
  return { id, pdf: result.pdf, fileName: `${data.fileName}-signed.pdf`, info: result.info };
}
