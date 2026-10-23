import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { ProfileView } from "./ProfileView";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return <ProfileView sessionUser={session} />;
}
