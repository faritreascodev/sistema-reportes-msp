import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { HistoryView } from "@/components/history/HistoryView";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return <HistoryView />;
}
