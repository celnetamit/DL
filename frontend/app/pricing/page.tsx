"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { useAuth } from "@/lib/auth";
import { createOrder, apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

// Define product type
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  tier: string;
  count: number;
};

export default function PricingPage() {
  const { token, user, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetchingProducts, setFetchingProducts] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const router = useRouter();

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
              console.error("Failed stats for", p.id);
            }
            return { ...p, count };
          })
        );

        setProducts(withStats);
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingProducts(false);
      }
    };
    loadCatalog();
  }, []);

  const handleCheckout = async (plan: Product) => {
    if (!token) {
      alert("Please login first to make a purchase.");
      router.push("/dashboard?redirect=/pricing");
      return;
    }
    setProcessingPlan(plan.id);
    try {
      // 1. Create order on backend (using Product ID as code)
      const res = await createOrder({ plan_code: plan.id, amount: plan.price * 100, currency: "INR" }, token);
      
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_change_me",
        amount: plan.price * 100, // Amount is in currency subunits. 
        currency: "INR",
        name: "Digital Library Pro Checkout",
        description: `Purchasing: ${plan.name}`,
        order_id: res.order.id, 
        handler: function (response: any) {
             alert(`Payment captured successfully! Processing...`);
             router.push("/dashboard");
        },
        prefill: {
            name: "Library User",
            email: user?.email || "",
        },
        theme: {
            color: "#D85B33" // Ember
        }
      };

      // @ts-ignore
      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", function (response: any){
              alert(`Payment Failed: ${response.error.description}`);
      });
      rzp1.open();

    } catch (err: any) {
      alert(err.message || "Checkout failed");
    } finally {
      setProcessingPlan(null);
    }
  };

  if (loading || fetchingProducts) return <p className="p-6 text-center text-dune/60">Loading Catalog...</p>;

  // Group products by Tier explicitly for UX hierarchy
  const domains = products.filter(p => ["domain", "bundle"].includes(p.tier));
  const subdomains = products.filter(p => p.tier === "subdomain");
  const singles = products.filter(p => p.tier === "content");

  const RenderGrid = ({ items }: { items: Product[] }) => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
      {items.map((plan) => (
        <div key={plan.id} className="glass rounded-3xl p-8 border border-dune/20 hover:border-dune/40 hover:bg-dune/5 transition flex flex-col items-start text-left">
          <p className="text-[10px] uppercase font-bold tracking-widest text-ember border border-ember/30 rounded-full px-2 py-0.5 mb-3">{plan.tier}</p>
          <h3 className="text-xl font-bold font-[var(--font-space)] line-clamp-1">{plan.name}</h3>
          
          <p className="text-3xl font-light mt-4 mb-2">
            ₹{plan.price} 
          </p>
          
          <p className="text-sm font-semibold text-dune/80 mb-6 bg-dune/10 px-3 py-1 rounded-full">
            Includes {plan.count} items
          </p>
          
          <p className="text-sm text-dune/60 mb-8 flex-1 line-clamp-3">
            {plan.description || "No description provided."}
          </p>

          <button
            onClick={() => handleCheckout(plan)}
            disabled={processingPlan === plan.id}
            className="w-full mt-auto rounded-full bg-midnight border border-dune/20 px-4 py-3 text-sm font-bold text-dune hover:bg-ember hover:text-midnight transition disabled:opacity-50"
          >
            {processingPlan === plan.id ? "Loading..." : "Purchase"}
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <main className="min-h-screen px-6 py-20 flex flex-col items-center">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="max-w-6xl w-full">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-ember">Explore Content</p>
          <h1 className="font-[var(--font-space)] text-4xl mt-3">Product Catalog</h1>
          <p className="text-sm text-dune/60 mt-4 max-w-lg mx-auto">Purchase full domains, explicit subdomains, or individual publications to build out your library.</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20 text-dune/40">
             <p>No products exist matching your criteria.</p>
          </div>
        ) : (
          <>
            {domains.length > 0 && (
              <>
                <h2 className="text-2xl font-bold font-[var(--font-space)] mb-6 text-dune border-b border-dune/10 pb-2">Full Domains & Bundles</h2>
                <RenderGrid items={domains} />
              </>
            )}
            
            {subdomains.length > 0 && (
              <>
                <h2 className="text-2xl font-bold font-[var(--font-space)] mb-6 text-dune border-b border-dune/10 pb-2">Specialized Subdomains</h2>
                <RenderGrid items={subdomains} />
              </>
            )}

            {singles.length > 0 && (
              <>
                <h2 className="text-2xl font-bold font-[var(--font-space)] mb-6 text-dune border-b border-dune/10 pb-2">Individual Contents</h2>
                <RenderGrid items={singles} />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
