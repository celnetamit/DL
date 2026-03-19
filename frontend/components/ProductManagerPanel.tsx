"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

const ALL_CONTENT_TYPES = [
  { value: "articles", label: "Articles" },
  { value: "ebooks", label: "E-Books" },
  { value: "videos", label: "Videos" },
  { value: "thesis", label: "Thesis" },
  { value: "journals", label: "Journals" },
  { value: "journal_articles", label: "Journal Articles" },
  { value: "conference_proceedings", label: "Conference Proceedings" },
  { value: "case_studies", label: "Case Studies" },
  { value: "emagazines", label: "E-Magazines" },
  { value: "enewspaper", label: "E-Newspaper" },
];

type Subdomain = { id: string; name: string };
type Domain = { id: string; name: string; subdomains: Subdomain[] };
type Content = { id: string; title: string; type: string };
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  tier: "content" | "subdomain" | "domain" | "bundle";
  content_types: string[];
  domain_id?: string;
  subdomain_id?: string;
  content_id?: string;
  bundle_domain_ids: string[];
  status: string;
};

export default function ProductManagerPanel() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<Partial<Product>>({
    tier: "domain",
    currency: "INR",
    price: 0,
    status: "active",
    content_types: [],
    bundle_domain_ids: [],
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [prodRes, domRes, allContents] = await Promise.all([
        apiFetch<Product[]>("/api/v1/products", { cache: "no-store" }),
        apiFetch<Domain[]>("/api/v1/domains", { cache: "no-store" }, token),
        apiFetch<Content[]>("/api/v1/contents", { cache: "no-store" }, token),
      ]);
      setProducts(prodRes || []);
      setDomains(domRes || []);
      setContents(allContents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const payload = {
      ...form,
      price: parseFloat(form.price as any) || 0,
      content_types: form.content_types || [],
    };

    try {
      if (editingId) {
        await apiFetch(`/api/v1/products/${editingId}`, { method: "PUT", body: JSON.stringify(payload) }, token);
      } else {
        await apiFetch("/api/v1/products", { method: "POST", body: JSON.stringify(payload) }, token);
      }
      setForm({ tier: "domain", currency: "INR", price: 0, status: "active", content_types: [], bundle_domain_ids: [] });
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to save product");
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Delete product forever?")) return;
    try {
      await apiFetch(`/api/v1/products/${id}`, { method: "DELETE" }, token);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (prod: Product) => {
    setEditingId(prod.id);
    setForm({ ...prod, content_types: prod.content_types || [] });
  };

  const toggleContentType = (val: string) => {
    const current = form.content_types || [];
    setForm({
      ...form,
      content_types: current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val],
    });
  };

  if (loading) return <p className="text-dune/60 p-6">Loading product catalog...</p>;

  const selectedDomainObj = domains.find((d) => d.id === form.domain_id);
  const activeSubdomains = selectedDomainObj ? selectedDomainObj.subdomains : [];

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start min-w-0">
      {/* ── Product List ── */}
      <div className="glass rounded-2xl p-6 min-w-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-[var(--font-space)]">Product Catalog</h3>
          <span className="text-xs text-dune/60">{products.length} registered</span>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {products.map((prod) => (
            <div key={prod.id} className="rounded-xl border border-dune/20 p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-lg">{prod.name}</h4>
                  <p className="text-sm text-dune/60 font-mono mt-1">
                    Tier: <span className="text-ember capitalize">{prod.tier}</span>
                  </p>
                  {prod.content_types && prod.content_types.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {prod.content_types.map((ct) => (
                        <span key={ct} className="text-[9px] uppercase tracking-widest bg-ember/10 text-ember rounded-full px-2 py-0.5">
                          {ct}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold font-[var(--font-space)] text-lg">₹{prod.price}</p>
                  <span className="text-[10px] uppercase tracking-widest text-dune/60 border border-dune/20 px-2 py-0.5 rounded-full">
                    {prod.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-dune mt-2 line-clamp-2">{prod.description}</p>

              <div className="flex gap-2 mt-4 pt-4 border-t border-dune/10">
                <a
                  href={`/product/${prod.id}`}
                  className="rounded-full bg-dune/10 px-3 py-1 text-xs hover:bg-dune/20"
                  target="_blank"
                >
                  Preview
                </a>
                <button
                  onClick={() => handleEdit(prod)}
                  className="rounded-full bg-dune/10 px-3 py-1 text-xs hover:bg-dune/20"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(prod.id)}
                  className="rounded-full border border-ember/40 text-ember px-3 py-1 text-xs hover:bg-ember/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-xs text-dune/60">No products configured yet.</p>}
        </div>
      </div>

      {/* ── Create / Edit Form ── */}
      <div className="glass rounded-2xl p-6 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
        <h3 className="text-lg font-[var(--font-space)] mb-4">{editingId ? "Edit Product" : "New Product"}</h3>

        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-widest text-dune/60">Product Name</span>
            <input
              required
              className="w-full rounded-xl bg-midnight px-3 py-2 text-sm text-dune border border-dune/20"
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-widest text-dune/60">Price (INR)</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl bg-midnight px-3 py-2 text-sm text-dune border border-dune/20"
              value={form.price || ""}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-widest text-dune/60">Target Tier</span>
            <select
              required
              className="w-full rounded-xl bg-midnight px-3 py-2 text-sm text-dune border border-dune/20"
              value={form.tier}
              onChange={(e) =>
                setForm({
                  ...form,
                  tier: e.target.value as any,
                  domain_id: undefined,
                  subdomain_id: undefined,
                  content_id: undefined,
                  content_types: [],
                })
              }
            >
              <option value="domain">Domain Pack</option>
              <option value="subdomain">Subdomain Pack</option>
              <option value="content">Single Content Item</option>
              <option value="bundle">Multi-Domain Bundle</option>
            </select>
          </label>

          {/* ── Content-Type Module Selector (shown for domain/subdomain/bundle) ── */}
          {(form.tier === "domain" || form.tier === "subdomain" || form.tier === "bundle") && (
            <div className="p-3 border border-dune/20 rounded-xl bg-dune/5 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-ember">Content Type Modules</p>
              <p className="text-[10px] text-dune/50">Select one or more — each becomes a separate module in the product view.</p>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_CONTENT_TYPES.map((ct) => {
                  const selected = (form.content_types || []).includes(ct.value);
                  return (
                    <button
                      type="button"
                      key={ct.value}
                      onClick={() => toggleContentType(ct.value)}
                      className={`rounded-lg text-[10px] px-2 py-1.5 border text-left transition-colors ${
                        selected
                          ? "bg-ember text-midnight border-ember font-semibold"
                          : "border-dune/20 text-dune/60 hover:border-dune/40"
                      }`}
                    >
                      {selected ? "✓ " : ""}{ct.label}
                    </button>
                  );
                })}
              </div>
              {(form.content_types || []).length === 0 && (
                <p className="text-[9px] text-dune/40 italic">No selection = all content types included.</p>
              )}
            </div>
          )}

          {/* ── Domain picker ── */}
          {form.tier === "domain" && (
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-ember">Pick Domain</span>
              <select
                required
                className="w-full rounded border border-ember/40 bg-midnight px-3 py-1.5 text-xs text-dune"
                value={form.domain_id || ""}
                onChange={(e) => setForm({ ...form, domain_id: e.target.value })}
              >
                <option value="">-- Choose Domain --</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          )}

          {/* ── Subdomain picker ── */}
          {form.tier === "subdomain" && (
            <div className="space-y-2 p-3 border border-ember/20 rounded-xl bg-ember/5">
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-ember">Parent Domain</span>
                <select
                  required
                  className="w-full rounded border border-ember/40 bg-midnight px-3 py-1.5 text-xs text-dune"
                  value={form.domain_id || ""}
                  onChange={(e) => setForm({ ...form, domain_id: e.target.value, subdomain_id: undefined })}
                >
                  <option value="">-- Choose Domain --</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-ember">Target Subdomain</span>
                <select
                  required
                  disabled={!form.domain_id}
                  className="w-full rounded border border-ember/40 bg-midnight px-3 py-1.5 text-xs text-dune disabled:opacity-40"
                  value={form.subdomain_id || ""}
                  onChange={(e) => setForm({ ...form, subdomain_id: e.target.value })}
                >
                  <option value="">-- Choose Subdomain --</option>
                  {activeSubdomains.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* ── Single content item picker ── */}
          {form.tier === "content" && (
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-ember">Pick Content Item</span>
              <select
                required
                className="w-full rounded border border-ember/40 bg-midnight px-3 py-1.5 text-xs text-dune"
                value={form.content_id || ""}
                onChange={(e) => setForm({ ...form, content_id: e.target.value })}
              >
                <option value="">-- Choose Explicit Content Item --</option>
                {contents.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.type}] {c.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* ── Bundle multi-select ── */}
          {form.tier === "bundle" && (
            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-ember">Pick Included Domains (Ctrl+Click)</span>
              <select
                multiple
                required
                className="w-full h-32 rounded border border-ember/40 bg-midnight px-3 py-1.5 text-xs text-dune"
                value={form.bundle_domain_ids || []}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setForm({ ...form, bundle_domain_ids: vals });
                }}
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="block space-y-1 mt-2">
            <span className="text-xs uppercase tracking-widest text-dune/60">Status</span>
            <select
              className="w-full rounded-xl bg-midnight px-3 py-2 text-sm text-dune border border-dune/20"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active (Visible)</option>
              <option value="draft">Draft (Hidden)</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-widest text-dune/60">Description</span>
            <textarea
              className="w-full rounded-xl bg-midnight px-3 py-2 text-sm text-dune border border-dune/20 h-20"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-ember px-5 py-3 text-sm font-semibold text-midnight hover:opacity-90 mt-2"
          >
            {editingId ? "Save Changes" : "Create Product"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ tier: "domain", currency: "INR", price: 0, status: "active", content_types: [], bundle_domain_ids: [] });
              }}
              className="w-full rounded-xl border border-dune/30 px-5 py-2 text-xs font-semibold hover:bg-dune/10 mt-1"
            >
              Cancel Edit
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
