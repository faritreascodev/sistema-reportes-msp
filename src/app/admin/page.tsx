"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

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

export default function AdminPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  // Formulario nuevo usuario
  const [newCedula, setNewCedula] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newCargo, setNewCargo] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"USER" | "ADMIN">("USER");

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
      if (!res.ok) throw new Error(data.error || "Error al cargar usuarios");
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: newCedula,
          nombre: newNombre,
          cargo: newCargo,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el usuario");

      setIsModalOpen(false);
      setNewCedula("");
      setNewNombre("");
      setNewCargo("");
      setNewPassword("");
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleUserActive = async (user: UserItem) => {
    if (!confirm(`¿Desea ${user.active ? "desactivar" : "activar"} el acceso de ${user.nombre}?`)) return;
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
      await loadUsers();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al cambiar estado");
    }
  };

  const handleResetPassword = async (user: UserItem) => {
    const newPass = prompt(`Ingrese la nueva contraseña para ${user.nombre}:`);
    if (!newPass || newPass.trim().length < 4) {
      if (newPass !== null) alert("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/usuarios/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPass.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      alert(`Contraseña de ${user.nombre} actualizada con éxito.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al actualizar contraseña");
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (
      !confirm(
        `¿Está seguro de eliminar al usuario ${user.nombre}?\n\n¡ATENCIÓN! Se eliminarán también todos los ${user.reportsCount} reportes creados por esta cuenta.`,
      )
    )
      return;

    try {
      const res = await fetch(`/api/admin/usuarios/${user.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      await loadUsers();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar usuario");
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-purple-600" />
            Panel de Administración
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Gestión de funcionarios, suscripciones y control de accesos del sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Crear Usuario
          </button>
        </div>
      </div>

      {/* Métricas del Sistema */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            <div className="text-xs text-gray-500">Usuarios Registrados ({totalActivos} activos)</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalReportes}</div>
            <div className="text-xs text-gray-500">Total de Reportes Generados</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">Activo</div>
            <div className="text-xs text-gray-500">Dominio: reportes-msp.multiprodo.com</div>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cédula, nombre o cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="text-xs text-gray-500">
            Mostrando {filteredUsers.length} de {users.length} usuarios
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando usuarios...</div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600 flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No se encontraron usuarios</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Cédula</th>
                  <th className="px-4 py-3">Funcionario / Cargo</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-center">Reportes</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{u.cedula}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{u.nombre}</div>
                      <div className="text-[11px] text-gray-500">{u.cargo || "Sin cargo especificado"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleUserActive(u)}
                        title="Click para cambiar estado de acceso"
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
                    <td className="px-4 py-3 text-center font-bold">{u.reportsCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleResetPassword(u)}
                          title="Restablecer contraseña"
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          title="Eliminar usuario"
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
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

      {/* Modal Crear Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-600" />
                Registrar Nuevo Funcionario
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700">Número de Cédula *</label>
                <input
                  type="text"
                  required
                  value={newCedula}
                  onChange={(e) => setNewCedula(e.target.value)}
                  placeholder="Ej. 0801234567"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700">Nombres y Apellidos Completos *</label>
                <input
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej. LCDA. MARÍA PÉREZ"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 focus:border-purple-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700">Cargo Institucional (Opcional)</label>
                <input
                  type="text"
                  value={newCargo}
                  onChange={(e) => setNewCargo(e.target.value)}
                  placeholder="Ej. ENFERMERA / PROMOTOR DE SALUD"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 focus:border-purple-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700">Contraseña Inicial *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700">Rol de Usuario</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "USER" | "ADMIN")}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 focus:border-purple-500 focus:outline-none"
                >
                  <option value="USER">Funcionario Estándar (Solo ve y crea sus reportes)</option>
                  <option value="ADMIN">Administrador (Control total y gestión de usuarios)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-3.5 py-2 font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Creando..." : "Guardar Funcionario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
