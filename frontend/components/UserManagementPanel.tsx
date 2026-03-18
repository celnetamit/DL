"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type User = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  institution_id?: string;
  institution?: { name: string };
  roles?: { name: string }[];
};

export default function UserManagementPanel({ token }: { token: string | null }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRole) params.set("role", filterRole);
      if (filterStatus) params.set("status", filterStatus);
      const data = await apiFetch<User[]>(`/api/v1/users?${params}`, {}, token);
      setUsers(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [token, filterRole, filterStatus]);

  const updateRole = async (userId: string, role: string) => {
    if (!token) return;
    setBusy(userId + "_role");
    try {
      await apiFetch(`/api/v1/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      }, token);
      await fetchUsers();
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
      await fetchUsers();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h3 className="font-[var(--font-space)] text-xl">User Management</h3>
        <div className="flex gap-3 flex-wrap">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
          >
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="super_admin">Super Admin</option>
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
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-dune/50">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-dune/50">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-dune/50 border-b border-dune/10">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Institution</th>
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
                      disabled={busy === u.id + "_role"}
                      className="rounded bg-midnight/60 border border-dune/20 px-2 py-1 text-xs"
                    >
                      <option value="student">student</option>
                      <option value="instructor">instructor</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </td>
                  <td className="py-3 pr-4 text-dune/60 text-xs">
                    {u.institution?.name ?? "—"}
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
                      disabled={busy === u.id + "_status"}
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
