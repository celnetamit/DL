"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, GraduationCap, Layers3, Users } from "lucide-react";
import { apiFetch, getInstitutionOverview } from "@/lib/api";
import Toast from "@/components/Toast";

type Institution = {
  id: string;
  name: string;
  domain: string;
  code: string;
  status: string;
  student_limit: number;
};

type InstitutionOverview = {
  summary: {
    total_members: number;
    active_members: number;
    inactive_members: number;
    active_learners: number;
    student_limit: number;
    seats_used: number;
    seats_remaining: number;
    seat_utilization_percent: number;
    active_subscriptions: number;
    total_subscriptions: number;
    active_products: number;
    avg_progress_percent: number;
  };
  members: Array<{
    id: string;
    full_name: string;
    email: string;
    status: string;
    progress_percent: number;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    plan_code: string;
    product_name?: string;
    created_at: string;
  }>;
};

const EMPTY_FORM = { name: "", domain: "", code: "", status: "active", student_limit: 0 };

export default function InstitutionPanel({ token }: { token: string | null }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [overviewById, setOverviewById] = useState<Record<string, InstitutionOverview>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"success" | "error">("success");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [overviewLoadingId, setOverviewLoadingId] = useState<string | null>(null);
  const [overviewErrorById, setOverviewErrorById] = useState<Record<string, string>>({});

  const fetchInstitutions = async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<Institution[]>("/api/v1/institutions", {}, token);
      setInstitutions(data || []);
      if (!selectedInstitutionId && data?.length) {
        setSelectedInstitutionId(data[0].id);
      }
    } catch (error: any) {
      setLoadError(error.message || "Unable to load institution accounts right now.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async (institutionId: string) => {
    if (!token) return;
    setOverviewLoadingId(institutionId);
    try {
      const overview = await getInstitutionOverview(institutionId, token);
      setOverviewById((prev) => ({ ...prev, [institutionId]: overview }));
      setOverviewErrorById((prev) => {
        const next = { ...prev };
        delete next[institutionId];
        return next;
      });
    } catch (error: any) {
      const nextError = error.message || "Unable to load institution analytics right now.";
      setOverviewErrorById((prev) => ({ ...prev, [institutionId]: nextError }));
      setMsg(nextError);
      setMsgTone("error");
    } finally {
      setOverviewLoadingId(null);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, [token]);

  useEffect(() => {
    if (selectedInstitutionId && token && !overviewById[selectedInstitutionId]) {
      fetchOverview(selectedInstitutionId);
    }
  }, [selectedInstitutionId, token, overviewById]);

  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution.id === selectedInstitutionId) || null,
    [institutions, selectedInstitutionId],
  );
  const selectedOverview = selectedInstitutionId ? overviewById[selectedInstitutionId] : null;
  const selectedOverviewError = selectedInstitutionId ? overviewErrorById[selectedInstitutionId] : null;

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      if (editingId) {
        await apiFetch(
          `/api/v1/institutions/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(form),
          },
          token,
        );
        setMsg("Institution updated");
        setMsgTone("success");
      } else {
        await apiFetch(
          "/api/v1/institutions",
          {
            method: "POST",
            body: JSON.stringify(form),
          },
          token,
        );
        setMsg("Institution created");
        setMsgTone("success");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      await fetchInstitutions();
      if (selectedInstitutionId) {
        await fetchOverview(selectedInstitutionId);
      }
    } catch (err: any) {
      setMsg(err.message || "Unable to save this institution right now.");
      setMsgTone("error");
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (institution: Institution) => {
    setEditingId(institution.id);
    setForm({
      name: institution.name,
      domain: institution.domain || "",
      code: institution.code || "",
      status: institution.status || "active",
      student_limit: institution.student_limit || 0,
    });
    setShowForm(true);
  };

  const toggleStatus = async (institution: Institution) => {
    if (!token) return;
    const nextStatus = institution.status === "active" ? "inactive" : "active";
    try {
      await apiFetch(
        `/api/v1/institutions/${institution.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ status: nextStatus }),
        },
        token,
      );
      await fetchInstitutions();
      await fetchOverview(institution.id);
      setMsg(`Institution ${nextStatus === "active" ? "activated" : "deactivated"} successfully`);
      setMsgTone("success");
    } catch (error: any) {
      setMsg(error.message || "Unable to update institution status right now.");
      setMsgTone("error");
    }
  };

  const activeInstitutions = institutions.filter((institution) => institution.status === "active").length;
  const totalSeatLimit = institutions.reduce((sum, institution) => sum + (institution.student_limit || 0), 0);

  return (
    <div className="space-y-6">
      {msg && <Toast message={msg} tone={msgTone} onClose={() => setMsg(null)} />}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Institutions</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{institutions.length}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Active Accounts</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{activeInstitutions}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Configured Seats</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{totalSeatLimit}</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-[var(--font-space)] text-2xl">Institution Portfolio</h3>
              <p className="mt-1 text-sm text-dune/60">
                Configure domains, invite codes, seat limits, and activation state for each institution.
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm((prev) => !prev);
                if (!showForm) {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }
              }}
              className="rounded-full bg-ember px-4 py-2 text-xs font-semibold text-midnight hover:opacity-90 transition"
            >
              {showForm ? "Close Form" : "+ New Institution"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreateOrUpdate} className="mb-6 grid gap-3 rounded-2xl border border-dune/10 bg-midnight/40 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  placeholder="Institution name *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Email domain (e.g. mit.edu)"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Invite code"
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
                <input
                  type="number"
                  min="0"
                  placeholder="Student seat limit"
                  value={form.student_limit}
                  onChange={(e) => setForm({ ...form, student_limit: Number(e.target.value) || 0 })}
                  className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-2 text-sm sm:col-span-2"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-fit rounded-full bg-ember px-5 py-2 text-xs font-semibold text-midnight disabled:opacity-50"
              >
                {busy ? "Saving..." : editingId ? "Save Institution" : "Create Institution"}
              </button>
            </form>
          )}

          {loading ? (
            <p className="text-sm text-dune/50">Loading institutions...</p>
          ) : loadError ? (
            <div className="rounded-2xl border border-ember/20 bg-ember/5 p-4 text-sm text-ember">
              {loadError}
            </div>
          ) : institutions.length === 0 ? (
            <p className="text-sm text-dune/50">No institutions yet. Create one to begin selling managed library access.</p>
          ) : (
            <div className="space-y-3">
              {institutions.map((institution) => {
                const overview = overviewById[institution.id];
                return (
                  <button
                    type="button"
                    key={institution.id}
                    onClick={() => {
                      setSelectedInstitutionId(institution.id);
                      fetchOverview(institution.id);
                    }}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      selectedInstitutionId === institution.id
                        ? "border-ember/50 bg-ember/5"
                        : "border-dune/10 bg-midnight/25 hover:border-dune/30"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-dune">{institution.name}</p>
                        <p className="mt-1 text-xs text-dune/50">
                          {institution.domain || "No domain"} · {institution.code || "No invite code"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-dune/55">
                          <span className="rounded-full bg-dune/10 px-2 py-1">
                            Seats {overview?.summary.seats_used ?? 0}/{institution.student_limit || 0}
                          </span>
                          <span className="rounded-full bg-dune/10 px-2 py-1">
                            {overviewLoadingId === institution.id && !overview ? "Refreshing..." : `Subs ${overview?.summary.active_subscriptions ?? 0}`}
                          </span>
                          <span className="rounded-full bg-dune/10 px-2 py-1">
                            Products {overview?.summary.active_products ?? 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                            institution.status === "active" ? "bg-moss/20 text-moss" : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {institution.status}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEdit(institution);
                          }}
                          className="rounded-full border border-dune/20 px-3 py-1 text-xs hover:border-ember hover:text-ember transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleStatus(institution);
                          }}
                          className="rounded-full border border-dune/20 px-3 py-1 text-xs hover:border-ember hover:text-ember transition"
                        >
                          {institution.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-ember" />
            <h3 className="font-[var(--font-space)] text-xl">Institution Health</h3>
          </div>

          {!selectedInstitution ? (
            <p className="mt-6 text-sm text-dune/50">Select an institution to inspect seats, members, subscriptions, and growth.</p>
          ) : overviewLoadingId === selectedInstitution.id && !selectedOverview ? (
            <p className="mt-6 text-sm text-dune/50">Loading institution analytics...</p>
          ) : selectedOverviewError && !selectedOverview ? (
            <div className="mt-6 rounded-2xl border border-ember/20 bg-ember/5 p-4 text-sm text-ember">
              <p>{selectedOverviewError}</p>
              <button
                type="button"
                onClick={() => fetchOverview(selectedInstitution.id)}
                className="mt-3 rounded-full border border-ember/30 px-3 py-1 text-xs font-semibold text-ember transition hover:bg-ember/10"
              >
                Retry Analytics Load
              </button>
            </div>
          ) : !selectedOverview ? (
            <p className="mt-6 text-sm text-dune/50">Institution analytics are not available yet. Try selecting the institution again.</p>
          ) : (
            <div className="mt-6 space-y-6">
              {selectedOverviewError && (
                <div className="rounded-2xl border border-ember/20 bg-ember/5 p-4 text-sm text-ember">
                  Showing the most recent saved overview. {selectedOverviewError}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-midnight/40 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-dune/55">
                    <Users className="h-4 w-4 text-ember" />
                    Seats
                  </div>
                  <p className="mt-3 text-3xl font-[var(--font-space)] text-dune">
                    {selectedOverview.summary.seats_used}
                    <span className="text-sm text-dune/45">/{selectedOverview.summary.student_limit || 0}</span>
                  </p>
                  <p className="mt-2 text-xs text-dune/55">{selectedOverview.summary.seats_remaining} seats remaining</p>
                </div>
                <div className="rounded-2xl bg-midnight/40 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-dune/55">
                    <Layers3 className="h-4 w-4 text-ember" />
                    Access Packs
                  </div>
                  <p className="mt-3 text-3xl font-[var(--font-space)] text-dune">
                    {selectedOverview.summary.active_products}
                  </p>
                  <p className="mt-2 text-xs text-dune/55">{selectedOverview.summary.active_subscriptions} active subscriptions</p>
                </div>
              </div>

              <div className="rounded-2xl border border-dune/10 bg-midnight/25 p-4">
                <p className="text-xs uppercase tracking-widest text-dune/55">Seat Utilization</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-dune/10">
                  <div
                    className="h-full rounded-full bg-ember"
                    style={{ width: `${Math.max(0, Math.min(100, selectedOverview.summary.seat_utilization_percent || 0))}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-dune/55">{selectedOverview.summary.seat_utilization_percent}% utilized</p>
              </div>

              <div className="rounded-2xl border border-dune/10 bg-midnight/25 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="h-4 w-4 text-ember" />
                  <p className="text-xs uppercase tracking-widest text-dune/55">Student Activity</p>
                </div>
                <div className="space-y-3">
                  {selectedOverview.members.slice(0, 4).map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-dune">{member.full_name}</p>
                        <p className="truncate text-xs text-dune/50">{member.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-ember">{member.progress_percent}% progress</p>
                        <p className="text-[10px] uppercase tracking-widest text-dune/45">{member.status}</p>
                      </div>
                    </div>
                  ))}
                  {selectedOverview.members.length === 0 && (
                    <p className="text-sm text-dune/50">No members enrolled yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-dune/10 bg-midnight/25 p-4">
                <p className="text-xs uppercase tracking-widest text-dune/55">Recent Subscription History</p>
                <div className="mt-3 space-y-2">
                  {selectedOverview.subscriptions.slice(0, 4).map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-dune">{sub.product_name || sub.plan_code}</p>
                        <p className="text-[10px] uppercase tracking-widest text-dune/45">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          sub.status === "active" ? "bg-moss/20 text-moss" : "bg-dune/20 text-dune/65"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>
                  ))}
                  {selectedOverview.subscriptions.length === 0 && (
                    <p className="text-sm text-dune/50">No subscription records for this institution yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
