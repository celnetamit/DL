"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  tier: string;
  count: number;
  content_types?: string[];
};

const TYPE_ICONS: Record<string, string> = {
  journal_articles: "📄",
  articles: "📝",
  ebooks: "📚",
  videos: "🎥",
  courses: "🎓",
};

export default function HomeClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const prods = await apiFetch<any[]>("/api/v1/products", { cache: "no-store" });
        if (!prods) return;

        const withStats = await Promise.all(
          prods.map(async (p) => {
            let count = 0;
            try {
              const st = await apiFetch<any>(`/api/v1/products/${p.id}/stats`, { cache: "no-store" });
              if (st && typeof st.content_count === "number") {
                count = st.content_count;
              }
            } catch (e) {
              // ignore
            }
            return { ...p, count };
          })
        );
        setProducts(withStats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadCatalog();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTier = tierFilter === "all" || p.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-ember">Digital Library Platform</p>
          <h1 className="text-4xl font-[var(--font-space)] font-semibold leading-tight sm:text-5xl">
            Explore the Digital Library
          </h1>
          <p className="text-lg text-dune/80">
            Discover comprehensive domains, specialized subdomains, and distinct publications tailored to accelerate your learning trajectory.
          </p>
        </section>

        {/* Search and Filters */}
        <section className="glass rounded-2xl p-4 flex flex-col sm:flex-row gap-4 sticky top-6 z-10 shadow-2xl shadow-midnight/50">
          <label htmlFor="search" className="sr-only">Search</label>
          <input 
            id="search"
            type="text"
            placeholder="Search products, topics, or domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-xl bg-midnight/60 border border-dune/20 px-4 py-3 text-sm text-dune focus:outline-none focus:border-ember transition-colors"
          />
          <div className="flex gap-2 min-w-max">
            {["all", "domain", "subdomain"].map((tier) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-semibold transition-all ${
                  tierFilter === tier 
                    ? "bg-ember text-midnight" 
                    : "bg-midnight/40 text-dune/60 hover:text-dune"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </section>

        {/* Catalog Grid */}
        <section>
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 rounded-full border-2 border-ember border-t-transparent animate-spin" />
              <p className="text-sm text-dune/60 uppercase tracking-widest font-semibold animate-pulse">Loading Catalog...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center glass rounded-3xl">
              <p className="text-4xl mb-4">🔍</p>
              <h3 className="text-xl font-[var(--font-space)]">No products found</h3>
              <p className="text-dune/60 mt-2">Try adjusting your search terms or filters.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((plan) => (
                <div key={plan.id} className="glass rounded-3xl p-6 flex flex-col border border-dune/10 hover:border-ember/40 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] uppercase tracking-widest bg-dune/10 text-dune px-3 py-1 rounded-full font-bold">
                      {plan.tier}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-moss bg-moss/10 px-2 py-1 rounded-md">
                      {plan.count} {plan.count === 1 ? "content" : "contents"}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-[var(--font-space)] mb-2 line-clamp-2">{plan.name}</h3>
                  <p className="text-sm text-dune/60 line-clamp-3 mb-6 flex-1">
                    {plan.description || "Comprehensive learning compilation covering core concepts and advanced applications."}
                  </p>

                  {plan.content_types && plan.content_types.length > 0 && (
                     <div className="flex flex-wrap gap-1.5 mb-6">
                       {plan.content_types.map(ct => (
                         <span key={ct} className="text-[9px] uppercase tracking-wider text-dune/50 border border-dune/10 px-2 py-0.5 rounded">
                           {TYPE_ICONS[ct] || "📁"} {ct}
                         </span>
                       ))}
                     </div>
                  )}
                  
                  <div className="flex items-end justify-between mt-auto pt-6 border-t border-dune/10">
                    <div>
                      <p className="text-[10px] uppercase text-dune/50 tracking-widest font-bold mb-1">Pricing</p>
                      <p className="text-2xl font-light text-ember">₹{plan.price}</p>
                    </div>
                    <Link
                      href={`/product/${plan.id}`}
                      className="rounded-full bg-dune/10 hover:bg-ember hover:text-midnight px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
