import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { getSession } from "@/lib/server/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reportes de Promoción · MSP",
  description: "Sistema institucional de gestión, exportación DOCX/PDF y firma digital de actividades de promoción de la salud del Ministerio de Salud Pública.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  const userNavData = session
    ? {
        id: session.userId,
        cedula: session.cedula,
        nombre: session.nombre,
        cargo: session.cargo,
        role: session.role,
      }
    : null;

  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col antialiased bg-slate-50/70 text-slate-900 selection:bg-brand-500 selection:text-white">
        <Navbar user={userNavData} />
        <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-200/80 bg-white/60 py-4 text-center text-xs text-slate-400">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 Ministerio de Salud Pública · Centro de Salud Tipo B N°1 Esmeraldas</p>
            <p className="font-mono text-[11px]">Sistema de Verificables Técnicos · Versión 2.0</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
