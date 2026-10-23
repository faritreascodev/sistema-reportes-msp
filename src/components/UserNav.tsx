"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";

export type UserNavData = {
  id: string;
  cedula: string;
  nombre: string;
  cargo: string | null;
  role: "ADMIN" | "USER";
};

export function UserNav({ initialUser = null }: { initialUser?: UserNavData | null }) {
  const [user, setUser] = useState<UserNavData | null>(initialUser);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  // Sincronizar usuario si cambia o si initialUser cambia
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  // Si cambia la ruta (ej. viene de /login), re-consultar me si no tenemos usuario
  useEffect(() => {
    if (!user && pathname !== "/login") {
      setLoading(true);
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.authenticated) setUser(data.user);
          else setUser(null);
        })
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    }
  }, [pathname, user]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      window.location.href = "/login";
    }
  };

  if (loading) {
    return <div className="h-8 w-24 animate-pulse rounded bg-slate-100" />;
  }

  if (!user) {
    if (pathname === "/login") return null;
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
      >
        <LogIn className="h-3.5 w-3.5 text-slate-500" />
        Acceso Funcionarios
      </Link>
    );
  }

  const primerNombre = user.nombre.split(" ").slice(0, 2).join(" ");

  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      {/* Pestaña Panel Admin visible exclusivamente para el rol ADMIN */}
      {user.role === "ADMIN" && (
        <Link
          href="/admin"
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all shadow-2xs ${
            pathname.startsWith("/admin")
              ? "bg-purple-600 text-white shadow-purple-600/20"
              : "border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Panel Admin</span>
          <span className="sm:hidden">Admin</span>
        </Link>
      )}

      {/* Info del usuario logueado */}
      <div className="hidden text-right md:block">
        <span className="block text-xs font-bold text-slate-900 leading-tight truncate max-w-[170px]" title={user.nombre}>
          {primerNombre}
        </span>
        <span className="block text-[10px] text-slate-500 font-medium truncate max-w-[170px]" title={user.cargo || ""}>
          {user.role === "ADMIN" ? "Administrador del Sistema" : user.cargo || "Funcionario MSP"}
        </span>
      </div>

      {/* Avatar con iniciales o icono */}
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border shadow-2xs ${
          user.role === "ADMIN"
            ? "bg-purple-100 text-purple-700 border-purple-200"
            : "bg-brand-100 text-brand-700 border-brand-200"
        }`}
        title={`${user.nombre} (${user.role})`}
      >
        <UserIcon className="h-4 w-4" />
      </div>

      {/* Botón Salir */}
      <button
        onClick={handleLogout}
        title="Cerrar sesión de forma segura"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
