import type { Prisma, Report } from "@/generated/prisma/client";
import { prisma } from "./db";
import { deleteStorage, deleteStorageDir } from "./storage";
import {
  reportDataSchema,
  type ReportData,
  type ReportDetail,
  type ReportStatus,
  type ReportSummary,
  type SignatureInfo,
  type VersionInfo,
} from "../report-types";

export class NotFoundError extends Error {
  constructor(what = "Reporte") {
    super(`${what} no encontrado`);
  }
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
// Las fechas de actividad se guardan a mediodía UTC para que ninguna zona horaria cambie el día.
const toDbDate = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

export function reportToData(r: Report): ReportData {
  return reportDataSchema.parse({
    fileName: r.fileName,
    status: r.status,
    encabezado: r.encabezado,
    institucion: r.institucion,
    componente: r.componente,
    tema: r.tema,
    fechaActividad: isoDate(r.fechaActividad),
    fechaTexto: r.fechaTexto,
    lugar: r.lugar,
    hora: r.hora,
    tecnica: r.tecnica,
    responsables: r.responsables,
    coordinada: r.coordinada,
    coordinados: r.coordinados,
    registroImageId: r.registroImageId,
    fotoIds: r.fotoIds,
  });
}

function dataToDb(d: ReportData) {
  return {
    fileName: d.fileName,
    status: d.status,
    encabezado: d.encabezado,
    institucion: d.institucion,
    componente: d.componente,
    tema: d.tema,
    fechaActividad: toDbDate(d.fechaActividad),
    fechaTexto: d.fechaTexto,
    lugar: d.lugar,
    hora: d.hora,
    tecnica: d.tecnica,
    responsables: d.responsables,
    coordinada: d.coordinada,
    coordinados: d.coordinados,
    registroImageId: d.registroImageId,
    fotoIds: d.fotoIds,
  } satisfies Prisma.ReportUncheckedCreateInput;
}

export type ListFilters = {
  q?: string;
  componente?: string;
  status?: string;
  desde?: string;
  hasta?: string;
  /** yyyy-mm */
  mes?: string;
  userId?: string;
};

export async function listReports(f: ListFilters = {}): Promise<ReportSummary[]> {
  const where: Prisma.ReportWhereInput = {};
  const and: Prisma.ReportWhereInput[] = [];

  if (f.userId) {
    and.push({
      OR: [{ userId: f.userId }, { userId: null }],
    });
  }

  if (f.q) {
    const terms = [...new Set([f.q, f.q.toUpperCase(), f.q.toLowerCase()])];
    and.push({
      OR: terms.flatMap((t) => [{ tema: { contains: t } }, { fileName: { contains: t } }, { componente: { contains: t } }, { lugar: { contains: t } }]),
    });
  }
  if (f.componente) and.push({ componente: f.componente });
  if (f.status === "BORRADOR" || f.status === "CONSOLIDADO") and.push({ status: f.status });
  const range: Prisma.DateTimeFilter = {};
  if (f.desde && /^\d{4}-\d{2}-\d{2}$/.test(f.desde)) range.gte = new Date(`${f.desde}T00:00:00.000Z`);
  if (f.hasta && /^\d{4}-\d{2}-\d{2}$/.test(f.hasta)) range.lte = new Date(`${f.hasta}T23:59:59.999Z`);
  if (f.mes && /^\d{4}-\d{2}$/.test(f.mes)) {
    const [y, m] = f.mes.split("-").map(Number);
    and.push({ fechaActividad: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) } });
  }
  if (range.gte || range.lte) and.push({ fechaActividad: range });
  if (and.length) where.AND = and;

  const rows = await prisma.report.findMany({
    where,
    orderBy: [{ fechaActividad: "desc" }, { updatedAt: "desc" }],
    include: { _count: { select: { signatures: true } } },
    take: 500,
  });
  return rows.map((r) => {
    const fotos = (r.fotoIds as (string | null)[]) ?? [];
    return {
      id: r.id,
      fileName: r.fileName,
      status: r.status as ReportStatus,
      version: r.version,
      componente: r.componente,
      tema: r.tema,
      fechaActividad: isoDate(r.fechaActividad),
      fechaTexto: r.fechaTexto,
      updatedAt: r.updatedAt.toISOString(),
      signatures: r._count.signatures,
      thumbnailId: fotos.find(Boolean) ?? r.registroImageId ?? null,
    };
  });
}

export async function listComponentes(): Promise<string[]> {
  const rows = await prisma.report.findMany({ distinct: ["componente"], select: { componente: true }, orderBy: { componente: "asc" } });
  return rows.map((r) => r.componente);
}

export async function getReport(id: string, userId?: string): Promise<ReportDetail> {
  const r = await prisma.report.findUnique({ where: { id } });
  if (!r) throw new NotFoundError();
  if (userId && r.userId && r.userId !== userId) {
    throw new NotFoundError();
  }
  return { id: r.id, version: r.version, data: reportToData(r), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}

export async function createReport(data: ReportData, userId?: string, note?: string): Promise<ReportDetail> {
  const r = await prisma.report.create({
    data: {
      ...dataToDb(data),
      userId: userId ?? null,
      version: 1,
      versions: { create: { version: 1, snapshot: data, note: note ?? "Versión inicial" } },
    },
  });
  return getReport(r.id);
}

/**
 * overwrite: actualiza el reporte y la instantánea de su versión actual.
 * new-version: incrementa la versión y crea una nueva instantánea; las anteriores quedan intactas.
 */
export async function saveReport(
  id: string,
  data: ReportData,
  mode: "overwrite" | "new-version",
  userId?: string,
  note?: string,
): Promise<ReportDetail> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.report.findUnique({ where: { id }, select: { version: true, userId: true } });
    if (!current) throw new NotFoundError();
    if (userId && current.userId && current.userId !== userId) {
      throw new NotFoundError();
    }
    const version = mode === "new-version" ? current.version + 1 : current.version;
    await tx.report.update({ where: { id }, data: { ...dataToDb(data), version } });
    await tx.reportVersion.upsert({
      where: { reportId_version: { reportId: id, version } },
      create: { reportId: id, version, snapshot: data, note: note ?? null },
      update: { snapshot: data, ...(note ? { note } : {}) },
    });
  });
  return getReport(id);
}

export async function duplicateReport(id: string, userId?: string): Promise<ReportDetail> {
  const { data } = await getReport(id, userId);
  return createReport({ ...data, fileName: `${data.fileName} (copia)`, status: "BORRADOR" }, userId, `Duplicado de ${id}`);
}

export async function deleteReport(id: string, userId?: string) {
  const r = await prisma.report.findUnique({
    where: { id },
    include: { signatures: true },
  });
  if (!r) throw new NotFoundError();
  if (userId && r.userId && r.userId !== userId) {
    throw new NotFoundError();
  }

  for (const s of r.signatures) {
    if (s.pdfPath) await deleteStorage(s.pdfPath).catch(() => undefined);
  }
  await deleteStorageDir(`signed/${id}`).catch(() => undefined);

  await prisma.report.delete({ where: { id } }).catch(() => {
    throw new NotFoundError();
  });
}

export async function listVersions(id: string): Promise<VersionInfo[]> {
  const rows = await prisma.reportVersion.findMany({ where: { reportId: id }, orderBy: { version: "desc" } });
  return rows.map((v) => ({ version: v.version, note: v.note, createdAt: v.createdAt.toISOString(), updatedAt: v.updatedAt.toISOString() }));
}

export async function getVersion(id: string, version: number): Promise<ReportData> {
  const v = await prisma.reportVersion.findUnique({ where: { reportId_version: { reportId: id, version } } });
  if (!v) throw new NotFoundError("Versión");
  return reportDataSchema.parse(v.snapshot);
}

export async function listSignatures(id: string): Promise<SignatureInfo[]> {
  const rows = await prisma.signature.findMany({ where: { reportId: id }, orderBy: { signedAt: "desc" } });
  return rows.map((s) => ({
    id: s.id, reportVersion: s.reportVersion, signerName: s.signerName, signerId: s.signerId,
    issuer: s.issuer, signedAt: s.signedAt.toISOString(), subFilter: s.subFilter, sha256: s.sha256,
  }));
}
