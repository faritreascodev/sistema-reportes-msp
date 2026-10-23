"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FilePlus2,
  LayoutDashboard,
  Layers,
  User,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Building,
} from "lucide-react";
import type { UserNavData } from "./UserNav";

export function Navbar({ user }: { user: UserNavData | null }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reportes", label: "Reportes", icon: Layers },
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Panel Admin", icon: ShieldCheck, admin: true }] : []),
    { href: "/perfil", label: "Mi Perfil", icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href={user ? "/dashboard" : "/login"} className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white shadow-md shadow-brand-700/20 group-hover:scale-105 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 tracking-tight">Reportes de Promoción</span>
                <span className="hidden sm:inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 border border-brand-200/60">
                  MSP
                </span>
              </div>
              <span className="block text-[11px] text-slate-500 font-medium">
                Centro de Salud Tipo B N° 1 · Esmeraldas
              </span>
            </div>
          </Link>

          {/* Links Principales (Desktop / Laptops / Tablets anchas) */}
          {user && (
            <nav className="hidden lg:flex items-center gap-1 ml-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? link.admin
                          ? "bg-purple-50 text-purple-700 font-bold"
                          : "bg-brand-50 text-brand-700 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? (link.admin ? "text-purple-600" : "text-brand-600") : "text-slate-400"}`} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Acciones Derecha */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Botón Nuevo Reporte */}
              <Link
                href="/reportes/nuevo"
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 active:scale-98 transition-all cursor-pointer"
              >
                <FilePlus2 className="h-4 w-4" />
                <span>Nuevo Reporte</span>
              </Link>

              {/* Info Funcionario (Desktop) */}
              <div className="hidden md:flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <Link href="/perfil" className="text-right hover:opacity-80 transition block" title="Ver mi perfil">
                  <span className="block text-xs font-bold text-slate-900 leading-tight truncate max-w-[160px]">
                    {user.nombre.split(" ").slice(0, 2).join(" ")}
                  </span>
                  <span className="block text-[10px] text-slate-500 font-medium truncate max-w-[160px]">
                    {user.role === "ADMIN" ? "Administrador" : user.cargo || "Funcionario MSP"}
                  </span>
                </Link>

                <Link
                  href="/perfil"
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border shadow-2xs hover:scale-105 transition-transform ${
                    user.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700 border-purple-200"
                      : "bg-brand-100 text-brand-700 border-brand-200"
                  }`}
                  title="Mi Perfil"
                >
                  <User className="h-4 w-4" />
                </Link>

                <button
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              {/* Botón Hamburguesa Móvil / Tablet */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                aria-label="Abrir menú"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : pathname !== "/login" ? (
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              Iniciar Sesión
            </Link>
          ) : null}
        </div>
      </div>

      {/* Menú Desplegable Móvil / Tablet */}
      {mobileMenuOpen && user && (
        <div className="lg:hidden border-t border-slate-200 bg-white p-4 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-200">
          {/* Perfil del Funcionario en Móvil */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold border ${
                user.role === "ADMIN" ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-brand-100 text-brand-700 border-brand-200"
              }`}
            >
              {user.nombre.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{user.nombre}</p>
              <p className="text-[10px] text-slate-500 truncate">
                Cédula: {user.cedula} · {user.role === "ADMIN" ? "Administrador" : user.cargo || "Funcionario"}
              </p>
            </div>
          </div>

          {/* Enlaces de Navegación Móvil */}
          <div className="space-y-1">
            <Link
              href="/reportes/nuevo"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg bg-brand-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>Crear Nuevo Reporte</span>
            </Link>

            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    isActive
                      ? link.admin
                        ? "bg-purple-100 text-purple-800"
                        : "bg-brand-50 text-brand-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? (link.admin ? "text-purple-600" : "text-brand-600") : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Botón Cerrar Sesión en Móvil */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
