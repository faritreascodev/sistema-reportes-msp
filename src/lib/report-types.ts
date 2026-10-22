import { z } from "zod";

/** Código compartido cliente/servidor: sin dependencias de Node. */

export const STATUSES = ["BORRADOR", "CONSOLIDADO"] as const;
export type ReportStatus = (typeof STATUSES)[number];

export const MAX_RESPONSABLES = 4;
export const MAX_COORDINADOS = 3;
export const PHOTO_SLOTS = 4;

const text = (max: number) => z.string().trim().max(max);

export const responsableSchema = z.object({
  nombres: text(160),
  cargo: text(160),
});

export const coordinadoSchema = z.object({
  nombre: text(160),
  institucion: text(160),
  cargo: text(160),
});

export const reportDataSchema = z.object({
  fileName: text(180).min(1, "El nombre del archivo es obligatorio"),
  status: z.enum(STATUSES).default("BORRADOR"),
  encabezado: text(200).min(1),
  institucion: z.array(text(160)).length(4),
  componente: text(300).min(1, "El componente es obligatorio"),
  tema: text(400).min(1, "El tema es obligatorio"),
  /** ISO yyyy-mm-dd */
  fechaActividad: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  fechaTexto: text(80).min(1),
  lugar: text(200),
  hora: text(80),
  tecnica: text(160),
  responsables: z.array(responsableSchema).min(1).max(MAX_RESPONSABLES),
  coordinada: z.boolean(),
  coordinados: z.array(coordinadoSchema).min(1).max(MAX_COORDINADOS),
  registroImageId: z.string().nullable(),
  fotoIds: z.array(z.string().nullable()).length(PHOTO_SLOTS),
});

export type ReportData = z.infer<typeof reportDataSchema>;
export type Responsable = z.infer<typeof responsableSchema>;
export type Coordinado = z.infer<typeof coordinadoSchema>;

export const saveRequestSchema = z.object({
  data: reportDataSchema,
  /** overwrite: sobrescribe la versión actual; new-version: crea versión N+1 */
  mode: z.enum(["overwrite", "new-version"]).default("overwrite"),
  note: z.string().trim().max(300).optional(),
});

export type ReportSummary = {
  id: string;
  fileName: string;
  status: ReportStatus;
  version: number;
  componente: string;
  tema: string;
  fechaActividad: string;
  fechaTexto: string;
  updatedAt: string;
  signatures: number;
  thumbnailId: string | null;
};

export type SignatureInfo = {
  id: string;
  reportVersion: number;
  signerName: string;
  signerId: string | null;
  issuer: string;
  signedAt: string;
  subFilter: string;
  sha256: string;
};

export type VersionInfo = { version: number; note: string | null; createdAt: string; updatedAt: string };

export type ReportDetail = { id: string; version: number; data: ReportData; createdAt: string; updatedAt: string };
