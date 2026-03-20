"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Script from "next/script";
import { useAuth } from "@/lib/auth";
import { createOrder, apiFetch, submitPurchaseLead, verifyOrderPayment } from "@/lib/api";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";

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
  const [requestingLead, setRequestingLead] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [purchaseRequest, setPurchaseRequest] = useState({
    full_name: "",
    email: "",
    phone: "",
    institution_name: "",
    product_id: "",
    message: "",
  });
  const router = useRouter();

  useEffect(() => {
    setPurchaseRequest((prev) => ({
      ...prev,
      full_name: user?.full_name || prev.full_name,
      email: user?.email || prev.email,
    }));
  }, [user?.email, user?.full_name]);

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
      setToast({ message: "Please sign in first to make a purchase.", tone: "error" });
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
        handler: async function (response: any) {
             try {
               await verifyOrderPayment({
                 razorpay_payment_id: response.razorpay_payment_id,
                 razorpay_order_id: response.razorpay_order_id,
                 razorpay_signature: response.razorpay_signature,
               }, token);
               setToast({ message: "Payment captured successfully and access has been activated.", tone: "success" });
               router.push("/dashboard?purchase=success");
             } catch (error: any) {
               setToast({
                 message: error?.message || "Payment succeeded, but access activation is still processing. Please refresh your dashboard shortly.",
                 tone: "error",
               });
               router.push("/dashboard?purchase=pending");
             }
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
              setToast({ message: `Payment failed: ${response.error.description}`, tone: "error" });
      });
      rzp1.open();

    } catch (err: any) {
      setToast({ message: err.message || "Checkout failed", tone: "error" });
    } finally {
      setProcessingPlan(null);
    }
  };

  const handlePurchaseRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setRequestingLead(true);
    try {
      const product = products.find((item) => item.id === purchaseRequest.product_id);
      await submitPurchaseLead({
        full_name: purchaseRequest.full_name,
        email: purchaseRequest.email,
        phone: purchaseRequest.phone,
        institution_name: purchaseRequest.institution_name,
        product_id: purchaseRequest.product_id || undefined,
        product_name: product?.name,
        plan_code: product?.id,
        amount: product ? Math.round(product.price * 100) : undefined,
        currency: product?.tier ? "INR" : undefined,
        subject: product ? `Purchase request for ${product.name}` : "Purchase request",
        message: purchaseRequest.message,
      });
      setToast({ message: "Your request has been recorded and sent to our CRM team.", tone: "success" });
      setPurchaseRequest((prev) => ({
        ...prev,
        phone: "",
        institution_name: "",
        product_id: "",
        message: "",
      }));
    } catch (error: any) {
      setToast({ message: error?.message || "We could not submit your purchase request right now.", tone: "error" });
    } finally {
      setRequestingLead(false);
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
        {toast && (
          <div className="mb-6">
            <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
          </div>
        )}
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

            <section className="mt-20 rounded-[2rem] border border-dune/15 bg-dune/5 p-8 md:p-10">
              <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-ember">Institutional Buying</p>
                  <h2 className="mt-3 font-[var(--font-space)] text-3xl text-dune">Need an invoice, quote, or team purchase workflow?</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-dune/65">
                    Submit your purchase request here. We will create a lead in our CRM/ERP, review the product mix you need,
                    and come back with the right commercial and access setup for your institution.
                  </p>
                </div>

                <form onSubmit={handlePurchaseRequest} className="space-y-4 rounded-[1.75rem] border border-dune/10 bg-midnight/30 p-6">
                  <input
                    required
                    type="text"
                    value={purchaseRequest.full_name}
                    onChange={(e) => setPurchaseRequest((prev) => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full rounded-2xl border border-dune/10 bg-midnight/50 px-4 py-3 text-dune outline-none transition focus:border-ember"
                  />
                  <input
                    required
                    type="email"
                    value={purchaseRequest.email}
                    onChange={(e) => setPurchaseRequest((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Work email"
                    className="w-full rounded-2xl border border-dune/10 bg-midnight/50 px-4 py-3 text-dune outline-none transition focus:border-ember"
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      type="tel"
                      value={purchaseRequest.phone}
                      onChange={(e) => setPurchaseRequest((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                      className="w-full rounded-2xl border border-dune/10 bg-midnight/50 px-4 py-3 text-dune outline-none transition focus:border-ember"
                    />
                    <input
                      type="text"
                      value={purchaseRequest.institution_name}
                      onChange={(e) => setPurchaseRequest((prev) => ({ ...prev, institution_name: e.target.value }))}
                      placeholder="Institution name"
                      className="w-full rounded-2xl border border-dune/10 bg-midnight/50 px-4 py-3 text-dune outline-none transition focus:border-ember"
                    />
                  </div>
                  <select
                    value={purchaseRequest.product_id}
                    onChange={(e) => setPurchaseRequest((prev) => ({ ...prev, product_id: e.target.value }))}
                    className="w-full rounded-2xl border border-dune/10 bg-midnight/50 px-4 py-3 text-dune outline-none transition focus:border-ember"
                  >
                    <option value="">Select a product of interest</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.tier})
                      </option>
                    ))}
                  </select>
                  <textarea
                    rows={4}
                    value={purchaseRequest.message}
                    onChange={(e) => setPurchaseRequest((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Tell us what you want to purchase, seat count, billing needs, or timeline."
                    className="w-full rounded-2xl border border-dune/10 bg-midnight/50 px-4 py-3 text-dune outline-none transition focus:border-ember"
                  />
                  <button
                    type="submit"
                    disabled={requestingLead}
                    className="w-full rounded-full bg-ember px-4 py-3 text-sm font-bold text-midnight transition hover:bg-ember/90 disabled:opacity-60"
                  >
                    {requestingLead ? "Submitting request..." : "Submit Purchase Request"}
                  </button>
                </form>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
