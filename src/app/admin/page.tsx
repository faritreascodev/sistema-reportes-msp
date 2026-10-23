"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Shield,
  FileText,
  Key,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  AlertCircle,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Activity,
  Check,
} from "lucide-react";
import { Dialog, Toast } from "@/components/ui";

type UserItem = {
  id: string;
  cedula: string;
  nombre: string;
  cargo: string | null;
  role: "ADMIN" | "USER";
  active: boolean;
  createdAt: string;
  reportsCount: number;
};

// Validador de cédula ecuatoriana
function validarCedulaEcuador(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const prov = parseInt(cedula.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;
  const tercerDigito = parseInt(cedula.charAt(2), 10);
  if (tercerDigito >= 6) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula.charAt(i), 10) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }
  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === parseInt(cedula.charAt(9), 10);
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(null);
  const router = useRouter();

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Formulario nuevo usuario
  const [newCedula, setNewCedula] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newCargo, setNewCargo] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"USER" | "ADMIN">("USER");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Formulario reset password
  const [resetPassword, setResetPassword] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/usuarios");
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar funcionarios");
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const cedulaValida = useMemo(() => {
    if (!newCedula) return true; // neutro al inicio
    return validarCedulaEcuador(newCedula);
  }, [newCedula]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarCedulaEcuador(newCedula)) {
      setToast({ msg: "La cédula ingresada no es válida para la República del Ecuador", tone: "error" });
      return;
    }
    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: newCedula.trim(),
          nombre: newNombre.trim().toUpperCase(),
          cargo: newCargo.trim().toUpperCase(),
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar el funcionario");

      setIsCreateOpen(false);
      setNewCedula("");
      setNewNombre("");
      setNewCargo("");
      setNewPassword("");
      setToast({ msg: `Funcionario ${newNombre} registrado exitosamente`, tone: "ok" });
      await loadUsers();
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Error al registrar funcionario", tone: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleUserActive = async (user: UserItem) => {
    try {
      const res = await fetch(`/api/admin/usuarios/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setToast({
        msg: `Acceso ${user.active ? "desactivado" : "activado"} para ${user.nombre}`,
        tone: "ok",
      });
      await loadUsers();
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "error" });
    }
  };

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || resetPassword.trim().length < 4) {
      setToast({ msg: "La contraseña debe tener al menos 4 caracteres", tone: "error" });
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setToast({ msg: `Contraseña actualizada para ${resetTarget.nombre}`, tone: "ok" });
      setResetTarget(null);
      setResetPassword("");
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const submitDeleteUser = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setToast({ msg: `Usuario ${deleteTarget.nombre} y sus reportes eliminados`, tone: "ok" });
      setDeleteTarget(null);
      await loadUsers();
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.nombre.toLowerCase().includes(search.toLowerCase()) ||
      u.cedula.includes(search) ||
      (u.cargo && u.cargo.toLowerCase().includes(search.toLowerCase())),
  );

  const totalActivos = users.filter((u) => u.active).length;
  const totalReportes = users.reduce((acc, u) => acc + u.reportsCount, 0);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-brand-600" />
            Panel de Control Institucional y Usuarios
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Administración de cuentas de funcionarios, roles, y auditoría general del sistema MSP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Registrar Funcionario
          </button>
        </div>
      </div>

      {/* Métricas del Sistema */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            <div className="text-xs text-gray-500">Funcionarios Registrados ({totalActivos} con acceso activo)</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalReportes}</div>
            <div className="text-xs text-gray-500">Total de Reportes Generados en el Sistema</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">Operativo</div>
            <div className="text-xs text-gray-500">reportes-msp.multiprodo.com</div>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cédula, nombre o cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Mostrando {filteredUsers.length} de {users.length} funcionarios
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">Cargando base de datos de funcionarios...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-600 flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">No se encontraron funcionarios coincidentes</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Cédula</th>
                  <th className="px-4 py-3">Funcionario / Cargo</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-center">Reportes</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{u.cedula}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{u.nombre}</div>
                      <div className="text-[11px] text-gray-500">{u.cargo || "Sin cargo especificado"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {u.role === "ADMIN" ? "Administrador" : "Funcionario"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleUserActive(u)}
                        title="Clic para cambiar estado de acceso"
                        className="cursor-pointer"
                      >
                        {u.active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 border border-rose-200">
                            <XCircle className="h-3 w-3 text-rose-600" />
                            Suspendido
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">{u.reportsCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setResetTarget(u);
                            setResetPassword("");
                          }}
                          title="Restablecer contraseña"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          title="Eliminar usuario"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Funcionario */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={
          <span className="flex items-center gap-2 text-brand-900">
            <UserPlus className="h-5 w-5 text-brand-600" />
            Registrar Nuevo Funcionario
          </span>
        }
        description="Ingrese los datos oficiales del personal de salud para habilitar su acceso al sistema."
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs pt-1">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Número de Cédula (10 dígitos) *</label>
            <input
              type="text"
              required
              maxLength={10}
              value={newCedula}
              onChange={(e) => setNewCedula(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej. 0801234567"
              className={`w-full rounded-lg border p-2 font-mono text-xs focus:outline-none ${
                newCedula.length === 10
                  ? cedulaValida
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-red-400 bg-red-50/30"
                  : "border-gray-300"
              }`}
            />
            {newCedula.length === 10 && !cedulaValida && (
              <p className="mt-1 text-[11px] text-red-600">Cédula no válida según el Registro Civil del Ecuador.</p>
            )}
            {newCedula.length === 10 && cedulaValida && (
              <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Cédula ecuatoriana válida
              </p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Nombres y Apellidos Completos *</label>
            <input
              type="text"
              required
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              placeholder="Ej. LCDA. MARÍA PÉREZ"
              className="w-full rounded-lg border border-gray-300 p-2 uppercase text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Cargo Institucional (Opcional)</label>
            <input
              type="text"
              value={newCargo}
              onChange={(e) => setNewCargo(e.target.value)}
              placeholder="Ej. ENFERMERA / PROMOTOR DE SALUD"
              className="w-full rounded-lg border border-gray-300 p-2 uppercase text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Contraseña Inicial *</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full rounded-lg border border-gray-300 p-2 pr-9 text-xs focus:border-brand-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Rol de Acceso</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "USER" | "ADMIN")}
              className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-brand-500 focus:outline-none bg-white"
            >
              <option value="USER">Funcionario Estándar (Solo ve y crea sus propios reportes)</option>
              <option value="ADMIN">Administrador (Control total del sistema y gestión de funcionarios)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-lg border border-gray-300 px-3.5 py-2 font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actionLoading || (newCedula.length === 10 && !cedulaValida)}
              className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? "Guardando..." : "Guardar Funcionario"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Modal Restablecer Contraseña */}
      <Dialog
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={
          <span className="flex items-center gap-2 text-gray-900">
            <Lock className="h-5 w-5 text-brand-600" />
            Restablecer Contraseña
          </span>
        }
        description={`Asigne una nueva clave de acceso para ${resetTarget?.nombre || "el usuario"}.`}
      >
        <form onSubmit={submitResetPassword} className="space-y-4 pt-1 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Nueva Contraseña *</label>
            <input
              type="password"
              required
              minLength={4}
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className="rounded-lg border border-gray-300 px-3.5 py-2 font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? "Actualizando..." : "Actualizar Contraseña"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Modal Eliminar Usuario */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={
          <span className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
            ¿Eliminar cuenta de funcionario?
          </span>
        }
        description="Esta acción es irreversible y eliminará al funcionario junto con todos sus reportes asociados."
      >
        <div className="space-y-3 py-2 text-xs">
          {deleteTarget && (
            <div className="rounded-lg bg-red-50/60 p-3 border border-red-200 text-red-900 space-y-1">
              <p className="font-bold">{deleteTarget.nombre}</p>
              <p className="text-[11px] text-red-700">Cédula: {deleteTarget.cedula}</p>
              <p className="text-[11px] font-semibold text-red-800">
                ¡Se eliminarán {deleteTarget.reportsCount} reportes creados por esta cuenta!
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-gray-300 px-3.5 py-2 font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submitDeleteUser}
              disabled={actionLoading}
              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? "Eliminando..." : "Sí, eliminar cuenta"}
            </button>
          </div>
        </div>
      </Dialog>

      <Toast message={toast?.msg ?? null} tone={toast?.tone ?? "ok"} onClose={() => setToast(null)} />
    </div>
  );
}
