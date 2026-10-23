import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { DashboardView } from "./DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const filter = session.role === "ADMIN" ? {} : { userId: session.userId };

  // Métricas y datos agregados en el servidor
  const [totalReportes, consolidados, conFirma, ultimosReportes, totalImagenes] = await Promise.all([
    prisma.report.count({ where: filter }),
    prisma.report.count({ where: { ...filter, status: "CONSOLIDADO" } }),
    prisma.report.count({ where: { ...filter, signatures: { some: {} } } }),
    prisma.report.findMany({
      where: filter,
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        user: { select: { nombre: true } },
        signatures: { select: { id: true } },
      },
    }),
    prisma.imageAsset.count(),
  ]);

  // Agrupar componentes más frecuentes
  const allReports = await prisma.report.findMany({
    where: filter,
    select: { componente: true },
  });

  const componentesMap: Record<string, number> = {};
  for (const r of allReports) {
    const comp = r.componente || "SIN COMPONENTE";
    componentesMap[comp] = (componentesMap[comp] ?? 0) + 1;
  }

  const componentesTop = Object.entries(componentesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nombre, cantidad]) => ({
      nombre,
      cantidad,
      porcentaje: totalReportes > 0 ? Math.round((cantidad / totalReportes) * 100) : 0,
    }));

  return (
    <DashboardView
      user={session}
      stats={{
        total: totalReportes,
        consolidados,
        borradores: totalReportes - consolidados,
        conFirma,
        totalImagenes,
      }}
      componentesTop={componentesTop}
      recentReports={ultimosReportes.map((r) => ({
        id: r.id,
        fileName: r.fileName,
        tema: r.tema,
        componente: r.componente,
        fechaActividad: r.fechaActividad.toISOString().slice(0, 10),
        status: r.status,
        version: r.version,
        signaturesCount: r.signatures.length,
        updatedAt: r.updatedAt.toISOString(),
      }))}
    />
  );
}
