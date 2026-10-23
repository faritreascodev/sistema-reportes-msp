/**
 * Datos de prueba: los reportes reales de ejemplo (2026) con sus imágenes.
 *   npm run db:seed
 * Es idempotente: borra reportes, versiones, firmas e imágenes y los vuelve a crear.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/server/db";
import { hashPassword } from "../src/lib/server/auth";
import { storeImage } from "../src/lib/server/images";
import { createReport, saveReport } from "../src/lib/server/reports";
import { ENCABEZADO_DEFAULT, INSTITUCION_DEFAULT, RESPONSABLE_DEFAULT } from "../src/lib/defaults";
import { fechaATexto } from "../src/lib/fechas";
import type { ReportData } from "../src/lib/report-types";

const assets = path.join(__dirname, "seed-assets");

async function main() {
  await prisma.signature.deleteMany();
  await prisma.reportVersion.deleteMany();
  await prisma.report.deleteMany();
  await prisma.imageAsset.deleteMany();
  await prisma.user.deleteMany();
  fs.rmSync(path.resolve(process.env.STORAGE_DIR ?? "./storage", "images"), { recursive: true, force: true });
  fs.rmSync(path.resolve(process.env.STORAGE_DIR ?? "./storage", "signed"), { recursive: true, force: true });

  // 1. Crear Administrador del Sistema
  await prisma.user.create({
    data: {
      cedula: "admin",
      nombre: "ADMINISTRADOR DEL SISTEMA",
      cargo: "ADMINISTRADOR",
      passwordHash: hashPassword("admin123"),
      role: "ADMIN",
      active: true,
    },
  });

  // 2. Crear Cuenta de Mercedes Torres (Madre)
  const madre = await prisma.user.create({
    data: {
      cedula: "0802058123",
      nombre: "ING. MARÍA DE LAS MERCEDES TORRES ESCOBAR",
      cargo: "ASISTENTE DE ADMISIÓN Y ATENCIÓN AL USUARIO",
      passwordHash: hashPassword("mercedes2026@"),
      role: "USER",
      active: true,
    },
  });

  const registro = await storeImage(fs.readFileSync(path.join(assets, "registro-participantes.png")), {
    originalName: "registro-participantes.png",
    quality: 88,
  });
  const fotos: string[] = [];
  for (let i = 1; i <= 4; i++) {
    fotos.push((await storeImage(fs.readFileSync(path.join(assets, `foto-${i}.jpeg`)), { originalName: `foto-${i}.jpeg` })).id);
  }

  const base = (over: Partial<ReportData> & Pick<ReportData, "componente" | "tema" | "fechaActividad" | "fileName">): ReportData => ({
    status: "CONSOLIDADO",
    encabezado: ENCABEZADO_DEFAULT,
    institucion: [...INSTITUCION_DEFAULT],
    fechaTexto: fechaATexto(over.fechaActividad),
    lugar: "CENTRO DE SALUD TIPO B N1",
    hora: "07:45 a.m. - 08:00 a.m.",
    tecnica: "CONVERSATORIO",
    responsables: [{ ...RESPONSABLE_DEFAULT }],
    coordinada: false,
    coordinados: [{ nombre: "", institucion: "", cargo: "" }],
    registroImageId: registro.id,
    fotoIds: fotos,
    ...over,
  });

  const reports: ReportData[] = [
    base({
      fileName: "SALUD SEXUAL Y REPRODUCTIVA - MERCEDES TORRES",
      componente: "SALUD SEXUAL Y REPRODUCTIVA",
      tema: "171 OPCIÓN 2",
      fechaActividad: "2026-06-10",
    }),
    base({
      fileName: "INSTITUCIONALIZACIÓN DE ENFOQUES DE DERECHOS HUMANOS, GÉNERO E INCLUSION EN LA SALUD - MERCEDES TORRES",
      componente: "INSTITUCIONALIZACIÓN DE ENFOQUES DE DERECHOS HUMANOS, GÉNERO E INCLUSION EN LA SALUD",
      tema: "DEBERES Y DERECHOS DE PACIENTES",
      fechaActividad: "2026-06-19",
      hora: "07:50 a.m. - 08:00 a.m.",
    }),
    base({
      fileName: "METODOLOGIA EDUCOMUNICACIONAL - MERCEDES TORRES",
      componente: "EDUCACIÓN Y PROMOCIÓN PARA LA SALUD",
      tema: "METODOLOGÍAS EDUCOMUNICACIONALES (MANUAL DE EDUCACIÓN Y COMUNICACIÓN PARA LA PROMOCIÓN DE LA SALUD)",
      fechaActividad: "2026-09-08",
    }),
    base({
      fileName: "171 SALUD SEXUAL Y REPRODUCTIVA - MERCEDES TORRES",
      status: "BORRADOR",
      componente: "SALUD SEXUAL Y REPRODUCTIVA",
      tema: "171 OPCIÓN 2",
      fechaActividad: "2026-09-11",
    }),
  ];

  for (const data of reports) {
    const r = await createReport(data, madre.id, "Importado de los reportes de ejemplo");
    // El de derechos humanos tuvo una segunda edición (01/09/2026) -> demuestra el versionado.
    if (data.tema === "DEBERES Y DERECHOS DE PACIENTES") {
      await saveReport(r.id, { ...data, fechaActividad: "2026-09-01", fechaTexto: fechaATexto("2026-09-01") }, "new-version", madre.id, "Réplica 01/09/2026");
    }
  }
  console.log(`Seed listo: Administrador y usuaria Mercedes creados. ${reports.length} reportes asociados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
