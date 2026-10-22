import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, FileText } from "lucide-react";
import { UserNav } from "@/components/UserNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reportes de Promoción · MSP",
  description: "Creación, historial, exportación DOCX/PDF y firma electrónica de reportes de verificable de actividades de promoción.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white">
                <FileText className="h-4 w-4" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-gray-900">Reportes de Promoción</span>
                <span className="block text-[11px] text-gray-500">Ministerio de Salud Pública · CS Tipo B N1</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/reportes/nuevo"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-600 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
              >
                <FilePlus2 className="h-4 w-4" />
                Nuevo reporte
              </Link>
              <UserNav />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-5">{children}</main>
      </body>
    </html>
  );
}
