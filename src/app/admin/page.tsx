import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();

  // Si no ha iniciado sesión, redirigir al login
  if (!session) {
    redirect("/login");
  }

  // RBAC Estricto: Si el usuario es un funcionario estándar (USER), no tiene permiso
  if (session.role !== "ADMIN") {
    redirect("/");
  }

  return <AdminDashboard currentUserId={session.userId} />;
}
