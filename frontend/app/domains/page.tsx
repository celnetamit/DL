"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

type Subdomain = {
  id: string;
  name: string;
};

type Domain = {
  id: string;
  name: string;
  subdomains?: Subdomain[];
};

type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  tier: string;
  domain_id?: string;
  subdomain_id?: string;
};

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [domainData, productData] = await Promise.all([
          apiFetch<Domain[]>("/api/v1/public/domains", { cache: "no-store" }),
          apiFetch<Product[]>("/api/v1/products", { cache: "no-store" }),
        ]);
        setDomains(domainData || []);
        setProducts(productData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    products.forEach((product) => {
      if (product.subdomain_id) {
        counts[product.subdomain_id] = (counts[product.subdomain_id] || 0) + 1;
      }
      if (product.domain_id && !product.subdomain_id) {
        categoryCounts[product.domain_id] = (categoryCounts[product.domain_id] || 0) + 1;
      }
    });

    domains.forEach((domain) => {
      const inheritedCount = categoryCounts[domain.id] || 0;
      if (!inheritedCount) return;
      (domain.subdomains || []).forEach((subdomain) => {
        counts[subdomain.id] = (counts[subdomain.id] || 0) + inheritedCount;
      });
    });

    return counts;
  }, [domains, products]);

  const visibleDomains = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return domains
      .filter((domain) => activeCategory === "all" || domain.id === activeCategory)
      .map((domain) => {
        const filteredSubdomains = (domain.subdomains || []).filter((subdomain) => {
          const matchesSearch =
            !normalizedSearch ||
            domain.name.toLowerCase().includes(normalizedSearch) ||
            subdomain.name.toLowerCase().includes(normalizedSearch);
          if (!matchesSearch) return false;
          if (tierFilter === "all") return true;
          const hasMatchingTier = products.some((product) => {
            const inSubdomain = product.subdomain_id === subdomain.id;
            const inheritedFromCategory =
              product.domain_id === domain.id && !product.subdomain_id;
            return (inSubdomain || inheritedFromCategory) && product.tier === tierFilter;
          });
          return hasMatchingTier;
        });
        return { ...domain, subdomains: filteredSubdomains };
      })
      .filter((domain) => (domain.subdomains || []).length > 0);
  }, [activeCategory, domains, products, searchQuery, tierFilter]);

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <section className="text-center space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-ember">Domains</p>
          <h1 className="text-4xl font-[var(--font-space)] font-semibold sm:text-5xl">Browse domains by category</h1>
          <p className="text-lg text-dune/70 max-w-3xl mx-auto">
            Domains are grouped by category. Choose a domain to see the products available inside it.
          </p>
        </section>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 rounded-full border-2 border-ember border-t-transparent animate-spin" />
            <p className="text-sm text-dune/60 uppercase tracking-widest font-semibold animate-pulse">Loading Domains...</p>
          </div>
        ) : domains.length === 0 ? (
          <div className="glass rounded-3xl p-8 text-center text-dune/60">No domains configured yet.</div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="h-fit rounded-3xl border border-dune/10 bg-dune/5 p-5 lg:sticky lg:top-24">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ember">Filters</p>
              <div className="mt-4 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-dune/50 mb-2">Search</p>
                  <input
                    type="text"
                    placeholder="Search category or domain..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-dune/20 bg-midnight/50 px-3 py-2 text-sm text-dune placeholder:text-dune/40 focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-dune/50 mb-2">Category</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveCategory("all")}
                      className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-widest ${
                        activeCategory === "all" ? "bg-ember text-midnight" : "bg-midnight/40 text-dune/60"
                      }`}
                    >
                      All
                    </button>
                    {domains.map((domain) => (
                      <button
                        key={domain.id}
                        onClick={() => setActiveCategory(domain.id)}
                        className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-widest ${
                          activeCategory === domain.id ? "bg-ember text-midnight" : "bg-midnight/40 text-dune/60"
                        }`}
                      >
                        {domain.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-dune/50 mb-2">Product Type</p>
                  <div className="flex flex-wrap gap-2">
                    {["all", "domain", "subdomain", "bundle", "content"].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setTierFilter(tier)}
                        className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-widest ${
                          tierFilter === tier ? "bg-ember text-midnight" : "bg-midnight/40 text-dune/60"
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex flex-col gap-12">
              {visibleDomains.length === 0 && (
                <div className="rounded-2xl border border-dune/10 bg-dune/5 p-8 text-center text-dune/60">
                  No domains matched the selected filters.
                </div>
              )}

              {visibleDomains.map((domain) => {
                const subdomains = domain.subdomains || [];
                return (
                  <section key={domain.id} className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-2xl font-[var(--font-space)] text-dune">{domain.name}</h2>
                      <p className="text-xs uppercase tracking-widest text-dune/40">Category · {subdomains.length} domains</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {subdomains.map((sub) => {
                        const count = productCounts[sub.id] || 0;
                        return (
                          <Link
                            key={sub.id}
                            href={`/domains/${sub.id}`}
                            className="glass rounded-3xl p-6 border border-dune/10 hover:border-ember/40 transition-colors group"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-dune/50">Domain</span>
                              <span className="text-[10px] uppercase tracking-widest font-bold text-moss bg-moss/10 px-2 py-1 rounded-md">
                                {count} {count === 1 ? "product" : "products"}
                              </span>
                            </div>
                            <h3 className="text-xl font-[var(--font-space)] mb-1 group-hover:text-ember transition-colors">
                              {sub.name}
                            </h3>
                            <p className="text-xs text-dune/50">Category: {domain.name}</p>
                            <span className="mt-6 inline-flex text-[10px] uppercase tracking-widest font-semibold text-ember/80">
                              View Products
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
