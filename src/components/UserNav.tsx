"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";

type UserData = {
  id: string;
  cedula: string;
  nombre: string;
  cargo: string | null;
  role: "ADMIN" | "USER";
};

export function UserNav() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) setUser(data.user);
        else setUser(null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return <div className="h-8 w-24 animate-pulse rounded bg-gray-100" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <LogIn className="h-3.5 w-3.5 text-gray-500" />
        Iniciar sesión
      </Link>
    );
  }

  const primerNombre = user.nombre.split(" ").slice(0, 2).join(" ");

  return (
    <div className="flex items-center gap-3">
      {user.role === "ADMIN" && (
        <Link
          href="/admin"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-3 text-xs font-semibold text-purple-700 hover:bg-purple-100"
        >
          <ShieldCheck className="h-4 w-4 text-purple-600" />
          Panel Admin
        </Link>
      )}

      <div className="hidden text-right sm:block">
        <span className="block text-xs font-medium text-gray-900 leading-none">{primerNombre}</span>
        <span className="block text-[10px] text-gray-500">
          {user.role === "ADMIN" ? "Administrador" : user.cargo || "Funcionario"}
        </span>
      </div>

      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200">
        <UserIcon className="h-4 w-4" />
      </div>

      <button
        onClick={handleLogout}
        title="Cerrar sesión"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
