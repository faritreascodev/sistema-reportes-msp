import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, FileText } from "lucide-react";
import { UserNav } from "@/components/UserNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reportes de Promoción · MSP",
  description: "Sistema de gestión, exportación DOCX/PDF y firma electrónica de reportes de verificable de actividades de promoción.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased bg-slate-50/70 text-slate-900 selection:bg-brand-500 selection:text-white">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-2xs">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-3 group">
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

            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <Link
                href="/reportes/nuevo"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-brand-700 active:scale-98 transition-all cursor-pointer"
              >
                <FilePlus2 className="h-4 w-4" />
                <span className="hidden xs:inline">Nuevo reporte</span>
                <span className="xs:hidden">Nuevo</span>
              </Link>
              <div className="h-5 w-px bg-slate-200 mx-0.5" />
              <UserNav />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
