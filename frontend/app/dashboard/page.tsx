"use client";

import Link from "next/link";
import AuthPanel from "@/components/AuthPanel";
import { useAuth } from "@/lib/auth";
import { getMySubscriptions, apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { useCompliance } from "@/hooks/useCompliance";
import { Download, Trash2, ShieldCheck } from "lucide-react";

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { exportData, deleteAccount } = useCompliance();
  const [subs, setSubs] = useState<any[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchSubs = () => {
    if (token) {
      getMySubscriptions(token).then(setSubs).catch(console.error);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, [token]);

  const handleCancel = async (subId: string) => {
    if (!token || !confirm("Are you sure you want to cancel this active subscription?")) return;
    setCancellingId(subId);
    try {
      await apiFetch(`/api/v1/subscriptions/${subId}/cancel`, { method: "PUT" }, token);
      fetchSubs();
    } catch (err: any) {
      alert(err.message || "Failed to cancel subscription");
    } finally {
      setCancellingId(null);
    }
  };

  const activeSubs = subs.filter(s => s.status === "active");

  return (
    <main className="px-6 py-10 min-h-screen">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-ember">
              Welcome back
            </p>
            <h1 className="font-[var(--font-space)] text-3xl">
              My Library & Account
            </h1>
          </div>
          <Link href="/" className="rounded-full bg-ember px-6 py-2 text-sm font-semibold text-midnight hover:bg-ember/90 transition-colors">
            Browse Catalog
          </Link>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="glass rounded-2xl p-6 border-t-2 border-t-ember">
            <p className="text-xs uppercase tracking-[0.2em] text-dune/60">Active Plans</p>
            <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">
              {activeSubs.length}
            </p>
            <p className="mt-2 text-sm text-dune/70">
              Personal or institutional subscriptions
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-dune/60">Content Unlocked</p>
            <p className="mt-4 text-4xl font-[var(--font-space)] text-dune">
              {activeSubs.length > 0 ? "Full" : "0"}
            </p>
            <p className="mt-2 text-sm text-dune/70">
              Access granted by current tiers
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-dune/60">Account Status</p>
            <p className="mt-4 text-lg font-semibold text-moss">
              Good Standing
            </p>
            <p className="mt-2 text-sm text-dune/70">
              {user?.email}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-[var(--font-space)] text-xl">
                  {user?.institution_id ? "Institution Access" : "My Subscriptions"}
                </h3>
              </div>
              
              {subs.length === 0 ? (
                 <div className="flex flex-col items-center justify-center p-8 border border-dashed border-dune/20 rounded-xl bg-midnight/20">
                    <span className="text-3xl mb-3">📦</span>
                    <p className="text-sm font-medium text-dune mb-1">No Active Plans</p>
                    <p className="text-xs text-dune/60 text-center mb-4 max-w-[250px]">
                      {user?.institution_id ? "Your institution has no active subscriptions mapped to your account." : "Subscribe to a tier in the catalog to unlock full library access."}
                    </p>
                    <Link href="/pricing" className="text-xs font-semibold px-4 py-2 bg-dune/10 hover:bg-dune/20 rounded-lg transition-colors">
                      View Pricing
                    </Link>
                 </div>
              ) : (
                <div className="space-y-4 mb-4">
                  {subs.map(sub => (
                    <div key={sub.id} className="p-5 border border-dune/20 rounded-xl bg-midnight/40 hover:bg-midnight/60 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-base font-semibold text-ember">{sub.plan_code}</p>
                          <p className="text-xs text-dune/50 mt-1 font-mono">
                            {user?.institution_id ? "Institution License" : "Personal Plan"}
                          </p>
                          {sub.status === "active" && (
                            <button
                              onClick={() => handleCancel(sub.id)}
                              disabled={cancellingId === sub.id}
                              className="mt-4 text-xs text-red-500 hover:text-red-400 font-semibold disabled:opacity-50"
                            >
                              {cancellingId === sub.id ? "Cancelling..." : "Cancel subscription"}
                            </button>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${sub.status === 'active' ? 'bg-moss/20 text-moss' : sub.status === 'created' ? 'bg-ember/20 text-ember' : 'bg-dune/20 text-dune'}`}>
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-dune/10">
                    <Link href="/pricing" className="text-xs text-ember hover:text-dune font-semibold uppercase tracking-widest transition-colors flex items-center gap-1">
                      Manage Plans &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            <AuthPanel />
            
            <div className="glass rounded-2xl p-6 border-l-4 border-l-ember/30">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-ember" />
                <h3 className="font-[var(--font-space)] text-xl">Privacy & Data</h3>
              </div>
              <p className="text-sm text-dune/70 mb-6">
                Exercise your rights under <span className="text-dune font-semibold">DPDP Act 2023</span>. Manage your personal data portability and account erasure.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={exportData}
                  className="w-full flex items-center justify-between px-4 py-3 bg-midnight/40 hover:bg-midnight/60 border border-dune/10 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-4 h-4 text-dune/40 group-hover:text-ember transition-colors" />
                    <span className="text-sm font-medium">Export My Data</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-tighter text-dune/30">JSON Format</span>
                </button>

                <button 
                  onClick={deleteAccount}
                  className="w-full flex items-center justify-between px-4 py-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-red-500/40 group-hover:text-red-500 transition-colors" />
                    <span className="text-sm font-medium text-red-500/80 group-hover:text-red-500">Delete Account</span>
                  </div>
                </button>
              </div>
              
              <p className="mt-6 text-[10px] text-dune/40 text-center italic">
                Deletions are permanent and take up to 24 hours to propagate across all systems.
              </p>
            </div>
            
            <div className="glass rounded-2xl p-6">
              <h3 className="font-[var(--font-space)] text-xl mb-4 text-dune/50">Need Help?</h3>
              <p className="text-sm text-dune/70 mb-4">
                If you have questions about your billing, institutional access, or navigating the catalog, our team is here to assist.
              </p>
              <Link href="/contact" className="text-xs uppercase tracking-widest font-semibold text-dune hover:text-ember transition-colors">
                Contact Support &rarr;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
