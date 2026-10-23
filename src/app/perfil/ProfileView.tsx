"use client";

import { useEffect, useState } from "react";
import {
  User,
  Shield,
  KeyRound,
  Building,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Loader2,
} from "lucide-react";
import { Toast } from "@/components/ui";
import type { SessionPayload } from "@/lib/server/auth";

export function ProfileView({ sessionUser }: { sessionUser: SessionPayload }) {
  const [profile, setProfile] = useState<{
    id: string;
    cedula: string;
    nombre: string;
    cargo: string | null;
    role: string;
    createdAt: string;
    reportsCount: number;
  } | null>(null);

  const [nombre, setNombre] = useState(sessionUser.nombre);
  const [cargo, setCargo] = useState(sessionUser.cargo || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setNombre(data.user.nombre);
          setCargo(data.user.cargo || "");
        }
      })
      .catch(() => undefined);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, cargo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar los datos");
      setToast({ msg: "Datos institucionales actualizados correctamente", tone: "ok" });
    } catch (err) {
      setToast({ msg: (err as Error).message, tone: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ msg: "La nueva contraseña y su confirmación no coinciden", tone: "error" });
      return;
    }
    if (newPassword.length < 4) {
      setToast({ msg: "La nueva contraseña debe tener al menos 4 caracteres", tone: "error" });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar la contraseña");
      setToast({ msg: "Contraseña actualizada exitosamente", tone: "ok" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setToast({ msg: (err as Error).message, tone: "error" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Perfil */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white font-bold text-2xl shadow-md shadow-brand-700/20">
            {sessionUser.nombre.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{sessionUser.nombre}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  sessionUser.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {sessionUser.role === "ADMIN" ? "Administrador" : "Funcionario MSP"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>Cédula: <strong className="font-mono text-slate-700">{sessionUser.cedula}</strong></span>
              <span>·</span>
              <span>{sessionUser.cargo || "Centro de Salud Tipo B N°1 Esmeraldas"}</span>
            </p>
          </div>
        </div>

        {profile && (
          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto">
            <div className="text-center sm:text-right">
              <div className="text-2xl font-bold text-brand-700">{profile.reportsCount}</div>
              <div className="text-[11px] text-slate-500 font-medium">Reportes Generados</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tarjeta: Datos Institucionales */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Building className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Datos Institucionales</h2>
              <p className="text-[11px] text-slate-500">Información reflejada en los reportes y carátulas oficiales.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cédula de Identidad (No editable)</label>
              <input
                type="text"
                disabled
                value={sessionUser.cedula}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nombres y Apellidos Completos</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 uppercase focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cargo Institucional</label>
              <input
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ej. ASISTENTE DE ADMISIÓN / ENFERMERA"
                className="w-full rounded-lg border border-slate-300 p-2.5 uppercase focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dependencia / Unidad Operativa</label>
              <input
                type="text"
                disabled
                value="CENTRO DE SALUD TIPO B N°1 ESMERALDAS - DISTRITO 08D01"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-500 cursor-not-allowed text-[11px]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 cursor-pointer transition"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>

        {/* Tarjeta: Seguridad y Contraseña */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <KeyRound className="h-5 w-5 text-purple-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Seguridad de la Cuenta</h2>
              <p className="text-[11px] text-slate-500">Actualice su contraseña periódicamente.</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contraseña Actual *</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingrese su contraseña actual"
                  className="w-full rounded-lg border border-slate-300 p-2.5 pr-9 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nueva Contraseña *</label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full rounded-lg border border-slate-300 p-2.5 pr-9 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Confirmar Nueva Contraseña *</label>
              <input
                type="password"
                required
                minLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita la nueva contraseña"
                className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50 cursor-pointer transition"
              >
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Actualizar Contraseña
              </button>
            </div>
          </form>
        </div>
      </div>

      <Toast message={toast?.msg ?? null} tone={toast?.tone ?? "ok"} onClose={() => setToast(null)} />
    </div>
  );
}
