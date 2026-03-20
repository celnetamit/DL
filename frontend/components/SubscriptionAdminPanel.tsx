"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

type Subscription = {
  id: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  institution_id?: string;
  product_id?: string;
  plan_code: string;
  status: string;
  razorpay_subscription_id?: string;
  razorpay_customer_id?: string;
  current_period_end?: string;
  cancel_at?: string;
  created_at: string;
};

type User = { id: string; email: string; full_name: string };
type Product = { id: string; name: string; tier: string; price: number };
type Institution = { id: string; name: string; code?: string; student_limit?: number };

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-500/20 text-green-400 border-green-500/30",
  created:   "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  past_due:  "bg-orange-500/20 text-orange-400 border-orange-500/30",
  halted:    "bg-dune/20 text-dune/60 border-dune/20",
};

const EMPTY_FORM = {
  user_id: "",
  institution_id: "",
  product_id: "",
  plan_code: "",
  status: "active",
  razorpay_subscription_id: "",
  razorpay_customer_id: "",
};

export default function SubscriptionAdminPanel({ token }: { token: string | null }) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const fetchSubs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const data = await apiFetch<Subscription[]>(`/api/v1/subscriptions/all?${params}`, {}, token);
      setSubs(data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [token, filterStatus]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<User[]>("/api/v1/admin/users", {}, token);
      setUsers(data || []);
    } catch {
      // Silently fail if the caller does not have permission to list users.
    }
  }, [token]);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await apiFetch<Product[]>("/api/v1/products", {});
      setProducts(data || []);
    } catch { /* silent */ }
  }, []);

  const fetchInstitutions = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<Institution[]>("/api/v1/institutions", {}, token);
      setInstitutions(data || []);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => { fetchSubs(); fetchUsers(); fetchProducts(); fetchInstitutions(); }, [fetchSubs, fetchUsers, fetchProducts, fetchInstitutions]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
    setSelectedSub(null);
  };

  const openEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setForm({
      user_id: sub.user_id || "",
      institution_id: sub.institution_id || "",
      product_id: sub.product_id || "",
      plan_code: sub.plan_code,
      status: sub.status,
      razorpay_subscription_id: sub.razorpay_subscription_id || "",
      razorpay_customer_id: sub.razorpay_customer_id || "",
    });
    setShowForm(true);
    setSelectedSub(null);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/api/v1/admin/subscriptions/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ plan_code: form.plan_code, status: form.status, product_id: form.product_id, razorpay_subscription_id: form.razorpay_subscription_id }),
        }, token);
      } else {
        await apiFetch("/api/v1/admin/subscriptions", {
          method: "POST",
          body: JSON.stringify(form),
        }, token);
      }
      setShowForm(false);
      setEditingId(null);
      fetchSubs();
    } catch { alert("Failed to save subscription"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Permanently delete this subscription?")) return;
    await apiFetch(`/api/v1/admin/subscriptions/${id}`, { method: "DELETE" }, token);
    fetchSubs();
    if (selectedSub?.id === id) setSelectedSub(null);
  };

  const handleCancel = async (sub: Subscription) => {
    if (!token || !confirm(`Cancel subscription for ${sub.user_email || sub.user_id}?`)) return;
    await apiFetch(`/api/v1/subscriptions/${sub.id}/cancel`, { method: "PUT" }, token);
    fetchSubs();
    setSelectedSub(null);
  };

  const filtered = subs.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const institutionName = institutions.find((institution) => institution.id === s.institution_id)?.name?.toLowerCase() || "";
    return (
      s.user_email?.toLowerCase().includes(q) ||
      s.user_name?.toLowerCase().includes(q) ||
      s.plan_code?.toLowerCase().includes(q) ||
      s.razorpay_subscription_id?.toLowerCase().includes(q) ||
      institutionName.includes(q)
    );
  });

  const institutionById = new Map(institutions.map((institution) => [institution.id, institution]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const activeCount = subs.filter((sub) => sub.status === "active").length;
  const institutionManagedCount = subs.filter((sub) => sub.institution_id).length;
  const linkedProductCount = subs.filter((sub) => sub.product_id).length;

  return (
    <div className="space-y-6 min-w-0">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Active Subscriptions</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{activeCount}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Institution Managed</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{institutionManagedCount}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Linked Products</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{linkedProductCount}</p>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start min-w-0">
      {/* ── Left: List ── */}
      <div className="glass rounded-2xl p-6 min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-[var(--font-space)] text-xl">Subscription Manager</h3>
            <p className="text-xs text-dune/50 mt-0.5">{subs.length} total subscriptions</p>
          </div>
          <button
            onClick={openCreate}
            className="rounded-full bg-ember px-4 py-1.5 text-xs font-semibold text-midnight hover:opacity-90"
          >
            + New Subscription
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            placeholder="Search email, plan, Razorpay ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="created">Created</option>
            <option value="cancelled">Cancelled</option>
            <option value="past_due">Past Due</option>
            <option value="halted">Halted</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-dune/50 py-8 text-center">Loading subscriptions...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-dune/50 py-8 text-center">No subscriptions found.</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => { setSelectedSub(s); setShowForm(false); }}
                className={`rounded-xl border p-4 cursor-pointer transition-all hover:border-ember/40 ${
                  selectedSub?.id === s.id ? "border-ember/60 bg-ember/5" : "border-dune/15"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{s.user_name || s.user_email || s.user_id || "Unknown"}</p>
                    {s.user_email && s.user_name && (
                      <p className="text-xs text-dune/50 truncate">{s.user_email}</p>
                    )}
                    {s.institution_id && (
                      <p className="text-[11px] text-ember/80 truncate mt-1">
                        Institution: {institutionById.get(s.institution_id)?.name || s.institution_id}
                      </p>
                    )}
                    <p className="text-xs font-mono text-dune/40 mt-0.5">Plan: {s.plan_code}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border ${STATUS_COLORS[s.status] || STATUS_COLORS.halted}`}>
                      {s.status}
                    </span>
                    <p className="text-[10px] text-dune/30 mt-1">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {s.razorpay_subscription_id && (
                  <p className="text-[9px] font-mono text-dune/30 mt-2 truncate">
                    rzp: {s.razorpay_subscription_id}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: Detail or Form ── */}
      <div className="sticky top-6 space-y-4">
        {/* Create / Edit Form */}
        {showForm && (
          <div className="glass rounded-2xl p-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
            <h4 className="font-[var(--font-space)] text-lg mb-4">{editingId ? "Edit Subscription" : "New Subscription"}</h4>
            <div className="space-y-3">
              {!editingId && (
                <label className="block space-y-1">
                  <span className="text-xs uppercase tracking-widest text-dune/60">User</span>
                  {users.length > 0 ? (
                    <select
                      className="w-full rounded-xl bg-midnight border border-dune/20 px-3 py-2 text-sm text-dune"
                      value={form.user_id}
                      onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                    >
                      <option value="">-- Select User --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-xl bg-midnight border border-dune/20 px-3 py-2 text-sm text-dune font-mono"
                      placeholder="Paste User ID (UUID)"
                      value={form.user_id}
                      onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                    />
                  )}
                </label>
              )}

              {!editingId && (
                <label className="block space-y-1">
                  <span className="text-xs uppercase tracking-widest text-dune/60">Institution</span>
                  <select
                    className="w-full rounded-xl bg-midnight border border-dune/20 px-3 py-2 text-sm text-dune"
                    value={form.institution_id}
                    onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
                  >
                    <option value="">-- Direct User Ownership --</option>
                    {institutions.map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.name} {institution.code ? `(${institution.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-dune/40">
                    Use institution ownership when the plan should unlock access for a managed student population.
                  </p>
                </label>
              )}

              {/* Product picker */}
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-widest text-dune/60">Linked Product</span>
                <select
                  className="w-full rounded-xl bg-midnight border border-dune/20 px-3 py-2 text-sm text-dune"
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                >
                  <option value="">-- No Product (Custom Plan) --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.tier}] {p.name} - Rs. {p.price}
                    </option>
                  ))}
                </select>
                {form.product_id && (
                  <p className="text-[10px] text-dune/40">Plan code will auto-fill from product name if left blank.</p>
                )}
              </label>

              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-widest text-dune/60">Plan Code *</span>
                <input
                  required
                  className="w-full rounded-xl bg-midnight border border-dune/20 px-3 py-2 text-sm text-dune font-mono"
                  placeholder="e.g. plan_xyz123 or CS_MONTHLY"
                  value={form.plan_code}
                  onChange={(e) => setForm({ ...form, plan_code: e.target.value })}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-widest text-dune/60">Status</span>
                <select
                  className="w-full rounded-xl bg-midnight border border-dune/20 px-3 py-2 text-sm text-dune"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="created">Created</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="past_due">Past Due</option>
                  <option value="halted">Halted</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-widest text-dune/60">Razorpay Subscription ID</span>
                <input
                  className="w-full rounded-xl bg-midnight border border-dune/20 px-3 py-2 text-xs text-dune font-mono"
                  placeholder="sub_xxxxxxx (optional)"
                  value={form.razorpay_subscription_id}
                  onChange={(e) => setForm({ ...form, razorpay_subscription_id: e.target.value })}
                />
              </label>

              {!editingId && (
                <label className="block space-y-1">
                  <span className="text-xs uppercase tracking-widest text-dune/60">Razorpay Customer ID</span>
                  <input
                    className="w-full rounded-xl bg-midnight border border-dune/20 px-3 py-2 text-xs text-dune font-mono"
                    placeholder="cust_xxxxxxx (optional)"
                    value={form.razorpay_customer_id}
                    onChange={(e) => setForm({ ...form, razorpay_customer_id: e.target.value })}
                  />
                </label>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.plan_code}
                  className="flex-1 rounded-xl bg-ember px-4 py-2.5 text-sm font-semibold text-midnight hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Subscription"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="rounded-xl border border-dune/20 px-4 py-2.5 text-xs hover:bg-dune/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscriber Detail Card */}
        {selectedSub && !showForm && (
          <div className="glass rounded-2xl p-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-[var(--font-space)] text-lg">Subscriber Details</h4>
              <button onClick={() => setSelectedSub(null)} className="text-dune/40 text-xs hover:text-dune">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-dune/40 uppercase tracking-widest">User</p>
                <p className="font-semibold">{selectedSub.user_name || "-"}</p>
                <p className="text-xs text-dune/60">{selectedSub.user_email || selectedSub.user_id || "-"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-dune/40 uppercase tracking-widest">Plan</p>
                  <p className="font-mono text-sm">{selectedSub.plan_code}</p>
                </div>
                <div>
                  <p className="text-xs text-dune/40 uppercase tracking-widest">Status</p>
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border ${STATUS_COLORS[selectedSub.status] || STATUS_COLORS.halted}`}>
                    {selectedSub.status}
                  </span>
                </div>
              </div>
              {selectedSub.product_id && (
                <div>
                  <p className="text-xs text-dune/40 uppercase tracking-widest">Product</p>
                  <p className="text-sm">{productById.get(selectedSub.product_id)?.name || selectedSub.product_id}</p>
                </div>
              )}
              {selectedSub.institution_id && (
                <div>
                  <p className="text-xs text-dune/40 uppercase tracking-widest">Institution Coverage</p>
                  <p className="text-sm">{institutionById.get(selectedSub.institution_id)?.name || selectedSub.institution_id}</p>
                </div>
              )}
              {selectedSub.razorpay_subscription_id && (
                <div>
                  <p className="text-xs text-dune/40 uppercase tracking-widest">Razorpay Sub ID</p>
                  <p className="font-mono text-xs break-all text-dune/70">{selectedSub.razorpay_subscription_id}</p>
                </div>
              )}
              {selectedSub.current_period_end && (
                <div>
                  <p className="text-xs text-dune/40 uppercase tracking-widest">Period Ends</p>
                  <p className="text-sm">{new Date(selectedSub.current_period_end).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-dune/40 uppercase tracking-widest">Created</p>
                <p className="text-sm">{new Date(selectedSub.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-5 pt-4 border-t border-dune/10">
              <button
                onClick={() => openEdit(selectedSub)}
                className="w-full rounded-xl bg-dune/10 py-2 text-xs font-semibold hover:bg-dune/20"
              >
                Edit Subscription
              </button>
              {selectedSub.status === "active" && (
                <button
                  onClick={() => handleCancel(selectedSub)}
                  className="w-full rounded-xl border border-amber-500/30 text-amber-400 py-2 text-xs font-semibold hover:bg-amber-500/10"
                >
                  ⏸ Cancel Subscription
                </button>
              )}
              <button
                onClick={() => handleDelete(selectedSub.id)}
                className="w-full rounded-xl border border-red-500/30 text-red-400 py-2 text-xs font-semibold hover:bg-red-500/10"
              >
                Delete Record
              </button>
            </div>
          </div>
        )}

        {!showForm && !selectedSub && (
          <div className="glass rounded-2xl p-8 text-center text-dune/40 text-xs">
            <p>Click a subscription to view details</p>
            <p className="mt-1">or</p>
            <button onClick={openCreate} className="mt-3 rounded-full bg-ember/10 text-ember px-4 py-1.5 text-xs font-semibold hover:bg-ember/20">
              + Create New
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
