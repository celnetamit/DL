"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  tier: string;
  count: number;
  content_types?: string[];
  domain_id?: string;
  subdomain_id?: string;
};

type Subdomain = {
  id: string;
  name: string;
};

type Domain = {
  id: string;
  name: string;
  subdomains?: Subdomain[];
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
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [prods, domainData] = await Promise.all([
          apiFetch<any[]>("/api/v1/products", { cache: "no-store" }),
          apiFetch<Domain[]>("/api/v1/domains", { cache: "no-store" }),
        ]);
        if (!prods) return;

        const withStats = await Promise.all(
          prods.map(async (p) => {
            let count = 0;
            try {
              const st = await apiFetch<any>(`/api/v1/products/${p.id}/stats`, { cache: "no-store" });
              if (st && typeof st.content_count === "number") {
                count = st.content_count;
              }
            } catch {
              // ignore stats failures for individual cards
            }
            return { ...p, count };
          }),
        );

        setProducts(withStats);
        setDomains(domainData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadCatalog();
  }, []);

  const domainById = useMemo(
    () =>
      domains.reduce<Record<string, Domain>>((acc, domain) => {
        acc[domain.id] = domain;
        return acc;
      }, {}),
    [domains],
  );

  const subdomainToDomainId = useMemo(() => {
    const map: Record<string, string> = {};
    domains.forEach((domain) => {
      (domain.subdomains || []).forEach((subdomain) => {
        map[subdomain.id] = domain.id;
      });
    });
    return map;
  }, [domains]);

  const getTierLabel = (plan: Product) => {
    if (plan.tier === "domain" && plan.domain_id) {
      return domainById[plan.domain_id]?.name || "Domain";
    }

    if (plan.tier === "subdomain") {
      if (plan.domain_id && domainById[plan.domain_id]?.name) {
        return domainById[plan.domain_id].name;
      }
      if (plan.subdomain_id) {
        const parentDomain = domains.find((domain) =>
          (domain.subdomains || []).some((subdomain) => subdomain.id === plan.subdomain_id),
        );
        if (parentDomain?.name) return parentDomain.name;
      }
      return "Main Domain";
    }

    return plan.tier;
  };

  const domainCards = useMemo(() => {
    return domains.map((domain) => {
      const relatedProducts = products.filter((product) => {
        if (product.domain_id === domain.id) return true;
        if (product.subdomain_id && subdomainToDomainId[product.subdomain_id] === domain.id) return true;
        return false;
      });

      const contentCount = relatedProducts.reduce((sum, product) => sum + (product.count || 0), 0);
      return {
        id: domain.id,
        name: domain.name,
        productCount: relatedProducts.length,
        contentCount,
      };
    });
  }, [domains, products, subdomainToDomainId]);

  const topDomains = domainCards.slice(0, 6);
  const topProducts = products.slice(0, 6);

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-ember">Digital Library Platform</p>
          <h1 className="text-4xl font-[var(--font-space)] font-semibold leading-tight sm:text-5xl">
            Explore the Digital Library
          </h1>
          <p className="text-lg text-dune/80">
            Discover comprehensive domains, specialized subdomains, and distinct publications tailored to accelerate your learning trajectory.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-ember">Domains</p>
              <h2 className="text-3xl font-[var(--font-space)] font-semibold">Primary Domain Categories</h2>
              <p className="text-sm text-dune/65 mt-2">Top 6 categories with product and content coverage.</p>
            </div>
            <Link
              href="/domains"
              className="inline-flex w-fit rounded-full border border-dune/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-dune/70 hover:border-ember/40 hover:text-dune"
            >
              View All Domains
            </Link>
          </div>

          {loading ? (
            <div className="py-14 text-center text-dune/60">Loading domains...</div>
          ) : topDomains.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center text-dune/60">No domains available.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {topDomains.map((domain) => (
                <div key={domain.id} className="glass rounded-3xl p-6 border border-dune/10 hover:border-ember/40 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-[10px] uppercase tracking-widest bg-dune/10 text-dune px-3 py-1 rounded-full font-bold">
                      Category
                    </span>
                    <span className="text-[10px] uppercase font-bold text-ember bg-ember/10 px-2 py-1 rounded-md">
                      {domain.productCount} {domain.productCount === 1 ? "product" : "products"}
                    </span>
                  </div>
                  <h3 className="text-2xl font-[var(--font-space)] mb-8 line-clamp-2">{domain.name}</h3>
                  <div className="flex items-end justify-between border-t border-dune/10 pt-6">
                    <div>
                      <p className="text-[10px] uppercase text-dune/50 tracking-widest font-bold mb-1">Contents</p>
                      <p className="text-2xl font-light text-ember">{domain.contentCount}</p>
                    </div>
                    <Link
                      href="/domains"
                      className="rounded-full bg-dune/10 hover:bg-ember hover:text-midnight px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors"
                    >
                      Browse
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-ember">Products</p>
              <h2 className="text-3xl font-[var(--font-space)] font-semibold">Featured Product Catalog</h2>
              <p className="text-sm text-dune/65 mt-2">Top 6 products with content count inside each pack.</p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex w-fit rounded-full border border-dune/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-dune/70 hover:border-ember/40 hover:text-dune"
            >
              View All Products
            </Link>
          </div>

          {loading ? (
            <div className="py-14 text-center text-dune/60">Loading products...</div>
          ) : topProducts.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center text-dune/60">No products available.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {topProducts.map((plan) => (
                <div key={plan.id} className="glass rounded-3xl p-6 flex flex-col border border-dune/10 hover:border-ember/40 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] uppercase tracking-widest bg-dune/10 text-dune px-3 py-1 rounded-full font-bold">
                      {getTierLabel(plan)}
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
                      {plan.content_types.map((ct) => (
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
