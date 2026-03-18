"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Institution = {
  id: string;
  name: string;
  domain: string;
  code: string;
  status: string;
};

export default function InstitutionPanel({ token }: { token: string | null }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", domain: "", code: "", status: "active" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchInstitutions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<Institution[]>("/api/v1/institutions", {}, token);
      setInstitutions(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInstitutions(); }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch("/api/v1/institutions", {
        method: "POST",
        body: JSON.stringify(form),
      }, token!);
      setForm({ name: "", domain: "", code: "", status: "active" });
      setShowForm(false);
      setMsg("Institution created ✓");
      await fetchInstitutions();
    } catch (err: any) {
      setMsg(err.message || "Failed to create");
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (inst: Institution) => {
    const newStatus = inst.status === "active" ? "inactive" : "active";
    try {
      await apiFetch(`/api/v1/institutions/${inst.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      }, token!);
      await fetchInstitutions();
    } catch { /* silent */ }
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-[var(--font-space)] text-xl">Institutions</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-ember px-4 py-1.5 text-xs font-semibold text-midnight hover:opacity-90 transition"
        >
          {showForm ? "Cancel" : "+ New Institution"}
        </button>
      </div>

      {msg && <p className="mb-4 text-xs text-moss">{msg}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="grid gap-3 mb-6 p-4 rounded-xl bg-midnight/40 border border-dune/10">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Institution Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
            />
            <input
              placeholder="Email Domain (e.g. mit.edu)"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
            />
            <input
              placeholder="Invite Code (e.g. MIT2026)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-fit rounded-full bg-ember px-5 py-2 text-xs font-semibold text-midnight disabled:opacity-50"
          >
            {busy ? "Creating..." : "Create Institution"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-dune/50">Loading...</p>
      ) : institutions.length === 0 ? (
        <p className="text-sm text-dune/50">No institutions yet. Create one above.</p>
      ) : (
        <div className="space-y-3">
          {institutions.map((inst) => (
            <div key={inst.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-midnight/40 border border-dune/10 px-4 py-3">
              <div>
                <p className="font-medium text-sm">{inst.name}</p>
                <p className="text-xs text-dune/50 mt-0.5">
                  {inst.domain && <span>Domain: {inst.domain} · </span>}
                  {inst.code && <span>Code: <span className="text-ember font-mono">{inst.code}</span></span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                  inst.status === "active" ? "bg-moss/20 text-moss" : "bg-red-500/20 text-red-400"
                }`}>
                  {inst.status}
                </span>
                <button
                  onClick={() => toggleStatus(inst)}
                  className="rounded-full border border-dune/20 px-3 py-1 text-xs hover:border-ember hover:text-ember transition"
                >
                  {inst.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
