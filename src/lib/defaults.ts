import { fechaATexto, hoyISO } from "./fechas";
import type { ReportData } from "./report-types";

export const ENCABEZADO_DEFAULT = "REPORTE DE VERIFICABLE DE ACTIVIDADES DE PROMOCIÓN";

export const INSTITUCION_DEFAULT = [
  "Dirección Provincial de Salud Esmeraldas – 08",
  "Unidad Provincial de Promoción, Salud intercultural e Igualdad",
  "Oficina Técnica 08OT01 Esmeraldas",
  "Centro de Salud Tipo B Número  1",
];

export const COMPONENTES_SUGERIDOS = [
  "EDUCACIÓN Y PROMOCIÓN PARA LA SALUD",
  "SALUD SEXUAL Y REPRODUCTIVA",
  "INSTITUCIONALIZACIÓN DE ENFOQUES DE DERECHOS HUMANOS, GÉNERO E INCLUSION EN LA SALUD",
  "PARTICIPACIÓN SOCIAL EN SALUD",
  "ALIMENTACIÓN Y NUTRICIÓN",
  "SALUD MENTAL",
];

export const TECNICAS_SUGERIDAS = ["CONVERSATORIO", "CHARLA", "TALLER", "DEMOSTRACIÓN", "SOCIODRAMA", "LLUVIA DE IDEAS"];

export const RESPONSABLE_DEFAULT = {
  nombres: "ING. MARÍA DE LAS MERCEDES TORRES ESCOBAR",
  cargo: "ASISTENTE DE ADMISIÓN Y ATENCIÓN AL USUARIO",
};

export function nuevoReporte(): ReportData {
  const fecha = hoyISO();
  return {
    fileName: "NUEVO REPORTE - MERCEDES TORRES",
    status: "BORRADOR",
    encabezado: ENCABEZADO_DEFAULT,
    institucion: [...INSTITUCION_DEFAULT],
    componente: "",
    tema: "",
    fechaActividad: fecha,
    fechaTexto: fechaATexto(fecha),
    lugar: "CENTRO DE SALUD TIPO B N1",
    hora: "07:45 a.m. - 08:00 a.m.",
    tecnica: "CONVERSATORIO",
    responsables: [{ ...RESPONSABLE_DEFAULT }],
    coordinada: false,
    coordinados: [{ nombre: "", institucion: "", cargo: "" }],
    registroImageId: null,
    fotoIds: [null, null, null, null],
  };
}

/** Nombre de archivo seguro para descargas (conserva tildes, quita caracteres inválidos en Windows). */
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 150) || "reporte";
}
