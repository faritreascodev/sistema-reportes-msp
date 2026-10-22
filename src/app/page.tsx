import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { HistoryView } from "@/components/history/HistoryView";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return <HistoryView />;
}
