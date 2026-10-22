import { notFound, redirect } from "next/navigation";
import { ReportEditor } from "@/components/editor/ReportEditor";
import { getSession } from "@/lib/server/auth";
import { getReport, listComponentes, listSignatures, listVersions, NotFoundError } from "@/lib/server/reports";

export const dynamic = "force-dynamic";

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const filterUserId = session.role !== "ADMIN" ? session.userId : undefined;

  try {
    const [report, versions, signatures, componentes] = await Promise.all([
      getReport(id, filterUserId),
      listVersions(id),
      listSignatures(id),
      listComponentes(),
    ]);
    return (
      <ReportEditor
        key={report.id}
        initial={report.data}
        reportId={report.id}
        version={report.version}
        versions={versions}
        signatures={signatures}
        componentes={componentes}
      />
    );
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}
