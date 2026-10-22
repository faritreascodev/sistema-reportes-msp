import { redirect } from "next/navigation";
import { ReportEditor } from "@/components/editor/ReportEditor";
import { nuevoReporte } from "@/lib/defaults";
import { getSession } from "@/lib/server/auth";
import { listComponentes } from "@/lib/server/reports";

export const dynamic = "force-dynamic";

export default async function NewReportPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const initial = nuevoReporte();
  if (session.nombre) {
    initial.responsables = [
      {
        nombres: session.nombre,
        cargo: session.cargo || "FUNCIONARIO MSP",
      },
    ];
    initial.fileName = `REPORTE DE ACTIVIDADES - ${session.nombre.split(" ").slice(0, 2).join(" ")}`;
  }

  return <ReportEditor initial={initial} componentes={await listComponentes()} />;
}
