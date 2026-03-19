"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

const TYPE_ICONS: Record<string, string> = {
  articles: "📄",
  ebooks: "📚",
  videos: "🎬",
  thesis: "🎓",
  journals: "📰",
  journal_articles: "📑",
  conference_proceedings: "🏛️",
  case_studies: "🔬",
  emagazines: "🗞️",
  enewspaper: "📋",
};

type Content = {
  id: string;
  title: string;
  type: string;
  status: string;
  source_url?: string;
  metadata?: Record<string, any>;
};

type Module = {
  type: string;
  contents: Content[];
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  tier: string;
  content_types: string[];
  status: string;
};

type ProductContentsResponse = {
  product: Product;
  modules: Module[];
  total: number;
  page: number;
  limit: number;
};

export default function ProductDetailClient({ id }: { id: string }) {
  const { token } = useAuth();
  const [data, setData] = useState<ProductContentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedType, setSelectedType] = useState<string>("");
  const [showSticky, setShowSticky] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleScroll = () => {
      setShowSticky(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const typeQuery = selectedType ? `&type=${selectedType}` : "";
    apiFetch<ProductContentsResponse>(`/api/v1/products/${id}/contents?page=${page}&limit=10${typeQuery}`, { cache: "no-store" })
      .then((res) => {
        setData(res);
        if (res?.modules && (page === 1 || selectedType)) {
          const defaults: Record<string, boolean> = {};
          res.modules.forEach((m) => (defaults[m.type] = true));
          setExpandedModules(defaults);
        }
        if (page > 1 || selectedType) {
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, page, selectedType]);

  if (loading)
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-dune/40 animate-pulse text-sm">Loading product...</div>
      </main>
    );

  if (!data)
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-dune/60">Product not found.</p>
      </main>
    );

  const { product, modules, total, limit } = data;
  const totalPages = Math.ceil(total / limit);

  return (
    <main className="px-4 py-10 min-h-screen relative">
      {/* ── Sticky Summary Card ── */}
      <div 
        className={`fixed top-4 left-4 right-4 z-50 transition-all duration-300 transform ${
          showSticky ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-auto max-w-4xl glass rounded-2xl p-4 flex items-center justify-between shadow-2xl border border-ember/20">
          <div className="flex items-center gap-4 min-w-0">
            <div className="hidden sm:block">
               <p className="text-[10px] uppercase tracking-widest text-ember/60 font-semibold">{product.tier} tier</p>
               <h2 className="text-sm font-bold truncate max-w-[200px]">{product.name}</h2>
            </div>
            <div className="h-8 w-px bg-dune/10 hidden sm:block"></div>
            <div>
              <p className="text-[10px] text-dune/40 uppercase tracking-widest leading-none mb-1">Price</p>
              <p className="font-bold text-sm">₹{product.price}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="text-right hidden lg:block">
                <p className="text-[10px] text-dune/40 uppercase tracking-widest leading-none mb-1">Page</p>
                <p className="font-mono text-[10px] font-bold">{page} / {totalPages}</p>
             </div>
             <Link
                href={`/pricing`}
                className="inline-flex items-center gap-2 rounded-full bg-ember px-5 py-2 font-bold text-xs text-midnight hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                {token ? "Premium Access" : "Subscribe Now"} →
              </Link>
          </div>
        </div>

        {/* ── Sub-row for Filters inside Sticky ── */}
        <div className="mx-auto max-w-4xl mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => { setSelectedType(""); setPage(1); }}
            className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
              selectedType === "" 
              ? "bg-ember text-midnight" 
              : "glass-dark text-dune/40 hover:text-dune/60"
            }`}
          >
            All
          </button>
          {product.content_types?.map((type) => (
            <button
              key={type}
              onClick={() => { setSelectedType(type); setPage(1); }}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                selectedType === type 
                ? "bg-ember text-midnight" 
                : "glass-dark text-dune/40 hover:text-dune/60"
              }`}
            >
              {TYPE_ICONS[type] || "📁"} {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-4xl flex flex-col gap-8">
        {/* ── Header ── */}
        <div className="glass rounded-3xl p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-[10px] uppercase tracking-widest text-ember border border-ember/30 rounded-full px-3 py-0.5">
              {product.tier} tier
            </span>
            <button 
              onClick={() => { setSelectedType(""); setPage(1); }}
              className={`text-[10px] uppercase tracking-widest rounded-full px-3 py-0.5 transition-all ${
                selectedType === "" ? "bg-ember text-midnight font-bold" : "bg-dune/10 text-dune/60"
              }`}
            >
              All
            </button>
            {product.content_types?.map((ct) => (
              <button 
                key={ct} 
                onClick={() => { setSelectedType(ct); setPage(1); }}
                className={`text-[10px] uppercase tracking-widest rounded-full px-3 py-0.5 transition-all ${
                  selectedType === ct ? "bg-ember text-midnight font-bold" : "bg-dune/10 text-dune/60"
                }`}
              >
                {TYPE_ICONS[ct] || "📁"} {ct}
              </button>
            ))}
          </div>
          <h1 className="font-[var(--font-space)] text-3xl md:text-4xl mb-3">{product.name}</h1>
          <p className="text-dune/70 text-sm leading-relaxed mb-6 max-w-2xl">{product.description}</p>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-dune/40 uppercase tracking-widest">Price</p>
              <p className="text-2xl font-bold font-[var(--font-space)]">₹{product.price}</p>
            </div>
            <div>
              <p className="text-xs text-dune/40 uppercase tracking-widest">Available Contents</p>
              <p className="text-2xl font-bold font-[var(--font-space)]">{total}</p>
            </div>
            <div>
              <p className="text-xs text-dune/40 uppercase tracking-widest">Modules</p>
              <p className="text-2xl font-bold font-[var(--font-space)]">{modules.length}</p>
            </div>
            <div className="ml-auto">
              <Link
                href={`/pricing`}
                className="inline-flex items-center gap-2 rounded-full bg-ember px-6 py-3 font-semibold text-sm text-midnight hover:opacity-90 transition-opacity"
              >
                Subscribe & Unlock →
              </Link>
            </div>
          </div>
        </div>

        {/* ── Modules area ── */}
        {modules.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-dune/50 text-sm">
            No content has been assigned to this product yet.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-widest text-dune/40 px-1">Content Modules</p>
            {modules.map((mod) => {
              const isOpen = expandedModules[mod.type] !== false;
              return (
                <div key={mod.type} className="glass rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedModules((prev) => ({ ...prev, [mod.type]: !isOpen }))}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-dune/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{TYPE_ICONS[mod.type] || "📁"}</span>
                      <div>
                        <p className="font-semibold capitalize">{mod.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-dune/40">{mod.contents.length} content{mod.contents.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <span className="text-dune/40 text-sm transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                      ▼
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-dune/10 divide-y divide-dune/5">
                      {mod.contents.map((item, itemIdx) => (
                        <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-dune/5 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-dune/30 text-xs w-5 shrink-0">{itemIdx + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm text-dune truncate pr-4">{item.title}</p>
                              {item.metadata?.domain && (
                                <p className="text-[10px] text-dune/40 mt-0.5">
                                  {item.metadata.domain}{item.metadata.subdomain ? ` › ${item.metadata.subdomain}` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 ml-4">
                            {item.source_url && token ? (
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-ember/10 text-ember text-[10px] px-3 py-1 hover:bg-ember/20 transition-colors"
                              >
                                Access ↗
                              </a>
                            ) : (
                              <Link
                                href="/pricing"
                                className="inline-flex items-center gap-1 rounded-full border border-dune/20 text-dune/40 text-[10px] px-3 py-1 hover:border-dune/40 transition-colors"
                              >
                                🔒 Subscribe
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t border-dune/10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="px-6 py-2 rounded-xl bg-midnight border border-dune/10 text-sm font-semibold hover:bg-dune/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  &larr; Previous Page
                </button>
                <div className="text-xs text-dune/40 font-mono tracking-widest">
                  PAGE {page} OF {totalPages}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                  className="px-6 py-2 rounded-xl bg-midnight border border-dune/10 text-sm font-semibold hover:bg-dune/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next Page &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
