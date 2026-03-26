"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

type Subdomain = {
  id: string;
  name: string;
  domain_id?: string;
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
  subdomain_id?: string;
  domain_id?: string;
  content_types?: string[];
};

export default function DomainDetailPage() {
  const params = useParams();
  const subdomainId = typeof params?.subdomainId === "string" ? params.subdomainId : "";

  const [domains, setDomains] = useState<Domain[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productStats, setProductStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

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

  const { subdomain, category } = useMemo(() => {
    let foundSub: Subdomain | null = null;
    let foundDomain: Domain | null = null;

    for (const domain of domains) {
      const match = (domain.subdomains || []).find((sub) => sub.id === subdomainId);
      if (match) {
        foundSub = match;
        foundDomain = domain;
        break;
      }
    }

    return { subdomain: foundSub, category: foundDomain };
  }, [domains, subdomainId]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSubdomain = product.subdomain_id === subdomainId;
      const inheritedFromCategory =
        !product.subdomain_id && !!category?.id && product.domain_id === category.id;
      return matchesSubdomain || inheritedFromCategory;
    });
  }, [category?.id, products, subdomainId]);

  useEffect(() => {
    const loadStats = async () => {
      if (filteredProducts.length === 0) {
        setProductStats({});
        return;
      }
      try {
        const entries = await Promise.all(
          filteredProducts.map(async (product) => {
            try {
              const stats = await apiFetch<{ content_count?: number }>(
                `/api/v1/products/${product.id}/stats`,
                { cache: "no-store" },
              );
              return [product.id, stats?.content_count ?? 0] as const;
            } catch {
              return [product.id, 0] as const;
            }
          }),
        );
        setProductStats(Object.fromEntries(entries));
      } catch (err) {
        console.error(err);
      }
    };
    loadStats();
  }, [filteredProducts]);

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <Link href="/domains" className="text-xs uppercase tracking-widest text-dune/50 hover:text-ember">
          ← Back to Domains
        </Link>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 rounded-full border-2 border-ember border-t-transparent animate-spin" />
            <p className="text-sm text-dune/60 uppercase tracking-widest font-semibold animate-pulse">Loading Domain...</p>
          </div>
        ) : !subdomain ? (
          <div className="glass rounded-3xl p-8 text-center text-dune/60">Domain not found.</div>
        ) : (
          <>
            <section className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-ember">Domain</p>
              <h1 className="text-4xl font-[var(--font-space)] font-semibold sm:text-5xl">{subdomain.name}</h1>
              <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest text-dune/50">
                <span className="rounded-full border border-dune/15 bg-dune/5 px-4 py-2">Category: {category?.name || "Unassigned"}</span>
                <span className="rounded-full border border-dune/15 bg-dune/5 px-4 py-2">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
                </span>
              </div>
            </section>

            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dune/10 bg-dune/5 p-8 text-center text-dune/60">
                No products have been assigned to this domain yet.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="glass rounded-3xl p-6 border border-dune/10 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-dune/50">{product.tier}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-moss bg-moss/10 px-2 py-1 rounded-md">
                        ₹{product.price}
                      </span>
                    </div>
                    <h3 className="text-xl font-[var(--font-space)] mb-2 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-dune/60 line-clamp-3 mb-6">
                      {product.description || "Curated access to domain-specific content."}
                    </p>
                    {!product.subdomain_id && product.domain_id === category?.id && (
                      <p className="mb-4 text-[10px] uppercase tracking-widest text-amber-300/80">
                        Category-level product
                      </p>
                    )}
                    {product.content_types && product.content_types.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {product.content_types.map((ct) => (
                          <span
                            key={ct}
                            className="text-[9px] uppercase tracking-wider text-dune/50 border border-dune/10 px-2 py-0.5 rounded"
                          >
                            {ct}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mb-5 text-xs uppercase tracking-widest text-dune/50">
                      {productStats[product.id] ?? 0} contents
                    </p>
                    <Link
                      href={`/product/${product.id}`}
                      className="mt-auto rounded-full bg-dune/10 hover:bg-ember hover:text-midnight px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors text-center"
                    >
                      View Product
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
