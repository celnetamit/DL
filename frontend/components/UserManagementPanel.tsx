"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import Toast from "@/components/Toast";
import {
  ADMIN_ROLE_OPTIONS,
  ROLE_SUBSCRIPTION_MANAGER,
  ROLE_SUPER_ADMIN,
  hasAnyRole,
  roleLabel,
} from "@/lib/roles";

type User = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  last_login_at?: string;
  last_active_at?: string;
  institution_id?: string;
  institution?: { name: string };
  roles?: { name: string }[];
};

type Institution = {
  id: string;
  name: string;
};

export default function UserManagementPanel({ token }: { token: string | null }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterInstitution, setFilterInstitution] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [institutionLoadError, setInstitutionLoadError] = useState<string | null>(null);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "student",
    status: "active",
    institution_id: "",
  });
  const roleNames = (user?.roles || []).map((role) => role.name);
  const canManageRoles = hasAnyRole(roleNames, [ROLE_SUPER_ADMIN]);
  const canManageStatuses = hasAnyRole(roleNames, [ROLE_SUPER_ADMIN, ROLE_SUBSCRIPTION_MANAGER]);

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    setUserLoadError(null);
    try {
      const params = new URLSearchParams();
      if (filterRole) params.set("role", filterRole);
      if (filterStatus) params.set("status", filterStatus);
      if (filterInstitution) params.set("institution_id", filterInstitution);
      const data = await apiFetch<User[]>(`/api/v1/users?${params}`, {}, token);
      setUsers(data);
      setMessage(null);
    } catch (error: any) {
      setUserLoadError(error.message || "Unable to load user records right now.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    if (!token) return;
    setInstitutionLoadError(null);
    try {
      const data = await apiFetch<Institution[]>("/api/v1/institutions", {}, token);
      setInstitutions(data || []);
    } catch (error: any) {
      setInstitutionLoadError(error.message || "Unable to load institution filters right now.");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token, filterRole, filterStatus, filterInstitution]);

  useEffect(() => {
    fetchInstitutions();
  }, [token]);

  const updateRole = async (userId: string, role: string) => {
    if (!token) return;
    setBusy(userId + "_role");
    try {
      await apiFetch(`/api/v1/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      }, token);
      setMessage("User role updated successfully.");
      setMessageTone("success");
      await fetchUsers();
    } catch (error: any) {
      setMessage(error.message || "Unable to update the selected role.");
      setMessageTone("error");
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (userId: string, current: string) => {
    if (!token) return;
    setBusy(userId + "_status");
    try {
      await apiFetch(`/api/v1/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: current === "active" ? "inactive" : "active" }),
      }, token);
      setMessage("User status updated successfully.");
      setMessageTone("success");
      await fetchUsers();
    } catch (error: any) {
      setMessage(error.message || "Unable to update user status.");
      setMessageTone("error");
    } finally {
      setBusy(null);
    }
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !canManageRoles) return;
    setBusy("create_user");
    try {
      await apiFetch("/api/v1/admin/users", {
        method: "POST",
        body: JSON.stringify(createForm),
      }, token);
      setCreateForm({
        email: "",
        password: "",
        full_name: "",
        role: "student",
        status: "active",
        institution_id: "",
      });
      setShowCreateForm(false);
      setMessage("User created successfully.");
      setMessageTone("success");
      await fetchUsers();
    } catch (error: any) {
      setMessage(error.message || "Unable to create the new user.");
      setMessageTone("error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="glass rounded-2xl p-6">
      {message && <Toast message={message} tone={messageTone} onClose={() => setMessage(null)} />}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="font-[var(--font-space)] text-xl">User Management</h3>
          <p className="mt-1 text-xs text-dune/50">View users, adjust access, and create admin-managed accounts.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {canManageRoles && (
            <button
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="rounded-lg bg-ember px-3 py-1.5 text-xs font-semibold text-midnight"
            >
              {showCreateForm ? "Close Create Form" : "+ New User"}
            </button>
          )}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
          >
            <option value="">All Roles</option>
            {ADMIN_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={filterInstitution}
            onChange={(e) => setFilterInstitution(e.target.value)}
            className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
          >
            <option value="">All Institutions</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {institutionLoadError && <p className="mb-4 text-sm text-ember">{institutionLoadError}</p>}
      {userLoadError && (
        <div className="mb-4 rounded-2xl border border-ember/20 bg-ember/5 p-4 text-sm text-ember">
          {userLoadError}
        </div>
      )}

      {showCreateForm && canManageRoles && (
        <form onSubmit={handleCreateUser} className="mb-6 grid gap-3 rounded-2xl border border-dune/10 bg-midnight/30 p-4 md:grid-cols-2">
          <input
            required
            value={createForm.full_name}
            onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
            placeholder="Full name"
            className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            placeholder="Email"
            className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            placeholder="Password"
            className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
          />
          <select
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
            className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
          >
            {ADMIN_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
          <select
            value={createForm.status}
            onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
            className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={createForm.institution_id}
            onChange={(e) => setCreateForm({ ...createForm, institution_id: e.target.value })}
            className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
          >
            <option value="">No Institution</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy === "create_user"}
            className="w-fit rounded-full bg-ember px-4 py-2 text-xs font-semibold text-midnight disabled:opacity-50"
          >
            {busy === "create_user" ? "Creating..." : "Create User"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-dune/50">Loading users...</p>
      ) : userLoadError ? (
        <p className="text-sm text-dune/50">Try refreshing the user list after the admin API is available again.</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-dune/50">
          {filterRole || filterStatus || filterInstitution
            ? "No users match the current filters."
            : "No users have been created yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-dune/50 border-b border-dune/10">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Institution</th>
                <th className="pb-3 pr-4">Last Active</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-dune/5 hover:bg-midnight/30 transition">
                  <td className="py-3 pr-4 font-medium">{u.full_name || "—"}</td>
                  <td className="py-3 pr-4 text-dune/70">{u.email}</td>
                  <td className="py-3 pr-4">
                    <select
                      defaultValue={u.roles?.[0]?.name ?? "student"}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      disabled={!canManageRoles || busy === u.id + "_role"}
                      className="rounded bg-midnight/60 border border-dune/20 px-2 py-1 text-xs"
                    >
                      {ADMIN_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    {!canManageRoles && (
                      <p className="mt-1 text-[10px] uppercase tracking-widest text-dune/35">Super admin only</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-dune/60 text-xs">
                    {u.institution?.name ?? institutions.find((institution) => institution.id === u.institution_id)?.name ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-dune/60 text-xs">
                    {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString() : u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      u.status === "active" ? "bg-moss/20 text-moss" : "bg-red-500/20 text-red-400"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => toggleStatus(u.id, u.status)}
                      disabled={!canManageStatuses || busy === u.id + "_status"}
                      className="rounded-full border border-dune/20 px-3 py-1 text-xs hover:border-ember hover:text-ember transition disabled:opacity-40"
                    >
                      {u.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
