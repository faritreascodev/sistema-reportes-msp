import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  redirect("/dashboard");
}
