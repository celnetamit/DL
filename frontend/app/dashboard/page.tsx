"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CreditCard,
  Download,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import AuthPanel from "@/components/AuthPanel";
import Toast from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { apiFetch, getInstitutionOverview, getMyPayments, getMyPurchases, getMySubscriptions } from "@/lib/api";
import { useCompliance } from "@/hooks/useCompliance";

type Product = {
  id: string;
  name: string;
  tier: string;
  price: number;
  currency: string;
  status: string;
  content_types?: string[];
};

type InstitutionMember = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  created_at: string;
  last_login_at?: string | null;
  last_active_at?: string | null;
  last_learning_at?: string | null;
  progress_percent: number;
  completed_lessons: number;
  roles?: { name: string }[];
};

type InstitutionOverview = {
  institution: {
    id: string;
    name: string;
    domain?: string;
    code?: string;
    status: string;
    student_limit: number;
  };
  summary: {
    total_members: number;
    active_members: number;
    inactive_members: number;
    active_learners: number;
    student_limit: number;
    seats_used: number;
    seats_remaining: number;
    seat_utilization_percent: number;
    active_subscriptions: number;
    total_subscriptions: number;
    active_products: number;
    billing_total: number;
    avg_progress_percent: number;
  };
  members: InstitutionMember[];
  subscriptions: Array<{
    id: string;
    status: string;
    plan_code: string;
    product_id?: string;
    product_name?: string;
    product_tier?: string;
    price?: number;
    currency?: string;
    current_period_end?: string | null;
    cancel_at?: string | null;
    created_at: string;
    content_types?: string[];
  }>;
  payments: Array<{
    id: string;
    purchase_id?: string;
    subscription_id?: string;
    product_id?: string;
    plan_code: string;
    description?: string;
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    product_name?: string;
    product_tier?: string;
    subscription_status?: string;
    access_status?: string;
  }>;
  product_access: Array<{
    product_id: string;
    name: string;
    tier: string;
    status: string;
    price: number;
    currency: string;
    content_types?: string[];
    active_subscription_count: number;
    total_subscription_count: number;
  }>;
  monthly_growth: Array<{
    label: string;
    students: number;
    active_learners: number;
  }>;
};

type PaymentRecord = {
  id: string;
  purchase_id?: string;
  subscription_id?: string;
  product_id?: string;
  plan_code: string;
  description?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  product_name?: string;
  product_tier?: string;
  subscription_status?: string;
  access_status?: string;
};

type PurchaseRecord = {
  id: string;
  user_id?: string;
  institution_id?: string;
  product_id?: string;
  subscription_id?: string;
  payment_id?: string;
  plan_code: string;
  purchase_type: string;
  access_status: string;
  payment_status: string;
  amount: number;
  currency: string;
  activated_at?: string | null;
  access_ends_at?: string | null;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  created_at: string;
  product_name?: string;
  product_tier?: string;
  subscription_status?: string;
  user_email?: string;
  institution_name?: string;
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-moss/20 text-moss",
  created: "bg-ember/20 text-ember",
  cancelled: "bg-red-500/20 text-red-400",
  inactive: "bg-red-500/20 text-red-400",
  past_due: "bg-amber-500/20 text-amber-400",
  halted: "bg-dune/20 text-dune/70",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatCurrency(amount?: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { exportData, deleteAccount, message: complianceMessage, messageTone: complianceMessageTone, clearMessage } = useCompliance();
  const [subs, setSubs] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [institutionOverview, setInstitutionOverview] = useState<InstitutionOverview | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [pendingDeleteAccount, setPendingDeleteAccount] = useState(false);

  const isInstitutionUser = Boolean(user?.institution_id);

  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      const [subscriptions, purchaseHistory, paymentHistory, productCatalog] = await Promise.all([
        getMySubscriptions(token),
        getMyPurchases(token),
        getMyPayments(token),
        apiFetch<Product[]>("/api/v1/products", { cache: "no-store" }),
      ]);
      setSubs(subscriptions || []);
      setPurchases(purchaseHistory || []);
      setPayments(paymentHistory || []);
      setProducts(productCatalog || []);
    } catch (error) {
      console.error(error);
    }

    if (user?.institution_id) {
      try {
        const overview = await getInstitutionOverview(user.institution_id, token);
        setInstitutionOverview(overview);
      } catch (error) {
        console.error(error);
        setInstitutionOverview(null);
      }
    } else {
      setInstitutionOverview(null);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token, user?.institution_id]);

  const handleCancel = async (subId: string) => {
    if (!token) return;
    setCancellingId(subId);
    try {
      await apiFetch(`/api/v1/subscriptions/${subId}/cancel`, { method: "PUT" }, token);
      await fetchDashboardData();
      setToast({ message: "Subscription cancelled successfully.", tone: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to cancel subscription", tone: "error" });
    } finally {
      setCancellingId(null);
      setPendingCancelId(null);
    }
  };

  const handleMemberAccessToggle = async (member: InstitutionMember) => {
    if (!token || !user?.institution_id) return;
    const nextStatus = member.status === "active" ? "inactive" : "active";
    setMemberBusyId(member.id);
    try {
      await apiFetch(
        `/api/v1/institutions/${user.institution_id}/members/${member.id}/status`,
        {
          method: "PUT",
          body: JSON.stringify({ status: nextStatus }),
        },
        token,
      );
      await fetchDashboardData();
      setToast({ message: `Student access ${nextStatus === "active" ? "restored" : "paused"} successfully.`, tone: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update student access", tone: "error" });
    } finally {
      setMemberBusyId(null);
    }
  };

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const enrichedSubscriptions = useMemo(
    () =>
      subs.map((sub) => {
        const product = sub.product_id ? productsById.get(sub.product_id) : undefined;
        return {
          ...sub,
          product_name: sub.product_name || product?.name || "Custom Plan",
          product_tier: sub.product_tier || product?.tier || "custom",
          price: sub.price ?? product?.price ?? 0,
          currency: sub.currency || product?.currency || "INR",
          content_types: sub.content_types || product?.content_types || [],
        };
      }),
    [productsById, subs],
  );

  const activeSubs = enrichedSubscriptions.filter((sub) => sub.status === "active");
  const activePurchases = purchases.filter((purchase) => purchase.access_status === "active");
  const capturedPayments = payments.filter((payment) => payment.status === "captured");
  const totalBilling = capturedPayments.reduce((sum, payment) => sum + payment.amount / 100, 0);
  const institutionSummary = institutionOverview?.summary;
  const memberLimit = institutionSummary?.student_limit || 0;
  const topMembers = institutionOverview?.members?.slice(0, 8) || [];

  const topStats = isInstitutionUser
    ? [
        {
          label: "Active Licenses",
          value: institutionSummary?.active_subscriptions ?? activeSubs.length,
          note: "Institution subscriptions currently providing access",
          icon: Building2,
        },
        {
          label: "Products Unlocked",
          value: institutionSummary?.active_products ?? institutionOverview?.product_access?.length ?? 0,
          note: "Purchased or subscribed packs available to your students",
          icon: BookOpen,
        },
        {
          label: "Seat Utilization",
          value: memberLimit > 0 ? `${institutionSummary?.seats_used ?? 0}/${memberLimit}` : `${institutionSummary?.seats_used ?? 0}`,
          note: memberLimit > 0 ? `${institutionSummary?.seats_remaining ?? 0} seats remaining` : "Seat limit not configured yet",
          icon: Users,
        },
        {
          label: "Growth Track",
          value: `${institutionSummary?.avg_progress_percent ?? 0}%`,
          note: `${institutionSummary?.active_learners ?? 0} students actively learning`,
          icon: TrendingUp,
        },
      ]
    : [
        {
          label: "Active Plans",
          value: activeSubs.length,
          note: "Personal or institution-backed subscriptions",
          icon: BookOpen,
        },
        {
          label: "Content Access",
          value: activePurchases.length > 0 ? "Unlocked" : "Limited",
          note: "Your current access level across the catalog",
          icon: ShieldCheck,
        },
        {
          label: "Billing Total",
          value: formatCurrency(totalBilling, enrichedSubscriptions[0]?.currency || "INR"),
          note: "Estimated plan value attached to your account",
          icon: CreditCard,
        },
        {
          label: "Account Status",
          value: "Good Standing",
          note: user?.email || "Signed-in member",
          icon: Users,
        },
      ];

  return (
    <main className="px-6 py-10 min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
        {complianceMessage && <Toast message={complianceMessage} tone={complianceMessageTone} onClose={clearMessage} />}
        <header className="flex flex-col gap-4 rounded-[2rem] border border-dune/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,132,77,0.18),_transparent_38%),linear-gradient(135deg,rgba(10,12,18,0.96),rgba(17,22,31,0.96))] p-8 shadow-2xl shadow-midnight/30 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-ember">
              {isInstitutionUser ? "Institution Workspace" : "Welcome back"}
            </p>
            <h1 className="mt-3 font-[var(--font-space)] text-3xl leading-tight md:text-4xl">
              {isInstitutionUser && institutionOverview
                ? `${institutionOverview.institution.name} Dashboard`
                : "My Library & Account"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-dune/70">
              {isInstitutionUser
                ? "Review purchased products, subscription coverage, seat limits, billing visibility, and student engagement from one dashboard."
                : "Track your access, subscriptions, privacy controls, and support options in one place."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-dune/10 px-6 py-2 text-sm font-semibold text-dune hover:bg-dune/20 transition-colors"
            >
              Browse Catalog
            </Link>
            <Link
              href="/pricing"
              className="rounded-full bg-ember px-6 py-2 text-sm font-semibold text-midnight hover:bg-ember/90 transition-colors"
            >
              Manage Plans
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {topStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass rounded-2xl border border-dune/10 p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-dune/55">{stat.label}</p>
                  <Icon className="h-4 w-4 text-ember" />
                </div>
                <p className="mt-4 font-[var(--font-space)] text-3xl text-dune">{stat.value}</p>
                <p className="mt-2 text-sm text-dune/65">{stat.note}</p>
              </div>
            );
          })}
        </section>

        {isInstitutionUser && institutionOverview ? (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
              <div className="glass rounded-3xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-ember">Purchased Access</p>
                    <h2 className="mt-2 font-[var(--font-space)] text-2xl">Library products available to your institution</h2>
                  </div>
                  <span className="rounded-full border border-dune/15 px-3 py-1 text-xs uppercase tracking-widest text-dune/60">
                    {institutionOverview.product_access.length} products
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {institutionOverview.product_access.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-dune/15 bg-midnight/30 p-6 text-sm text-dune/60 md:col-span-2">
                      No institution products are attached yet. Once a subscription is linked, access packs will appear here.
                    </div>
                  ) : (
                    institutionOverview.product_access.map((product) => (
                      <div key={product.product_id} className="rounded-2xl border border-dune/10 bg-midnight/35 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-dune">{product.name}</h3>
                            <p className="mt-1 text-xs uppercase tracking-widest text-dune/45">{product.tier} package</p>
                          </div>
                          <span className="rounded-full bg-ember/10 px-3 py-1 text-[10px] uppercase tracking-widest text-ember">
                            {product.active_subscription_count} active
                          </span>
                        </div>
                        <p className="mt-4 text-xl font-[var(--font-space)] text-ember">
                          {formatCurrency(product.price, product.currency)}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(product.content_types || []).length > 0 ? (
                            product.content_types!.map((type) => (
                              <span key={type} className="rounded-full bg-dune/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-dune/70">
                                {type}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-dune/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-dune/50">
                              Full catalog coverage
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="glass rounded-3xl p-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-ember" />
                    <h2 className="font-[var(--font-space)] text-xl">Seat Capacity & Access</h2>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-4xl font-[var(--font-space)] text-dune">
                        {institutionSummary?.seats_used ?? 0}
                        {memberLimit > 0 ? <span className="text-lg text-dune/45">/{memberLimit}</span> : null}
                      </p>
                      <p className="mt-2 text-sm text-dune/65">
                        {memberLimit > 0
                          ? `${institutionSummary?.seats_remaining ?? 0} student seats remaining`
                          : "Ask the subscription manager to configure a seat cap for this institution."}
                      </p>
                    </div>
                    <span className="rounded-full bg-dune/10 px-3 py-1 text-xs uppercase tracking-widest text-dune/60">
                      {institutionSummary?.seat_utilization_percent ?? 0}% utilized
                    </span>
                  </div>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-dune/10">
                    <div
                      className="h-full rounded-full bg-ember transition-all"
                      style={{ width: `${clampPercent(institutionSummary?.seat_utilization_percent ?? 0)}%` }}
                    />
                  </div>
                </div>

                <div className="glass rounded-3xl p-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-ember" />
                    <h2 className="font-[var(--font-space)] text-xl">Growth Track Analytics</h2>
                  </div>
                  <div className="mt-5 space-y-4">
                    {institutionOverview.monthly_growth.map((point) => {
                      const chartMax = Math.max(
                        1,
                        ...institutionOverview.monthly_growth.map((entry) =>
                          Math.max(entry.students, entry.active_learners),
                        ),
                      );
                      return (
                        <div key={point.label}>
                          <div className="mb-2 flex items-center justify-between text-xs text-dune/55">
                            <span>{point.label}</span>
                            <span>{point.active_learners} active learners</span>
                          </div>
                          <div className="grid grid-cols-[1fr_1fr] gap-2">
                            <div className="rounded-full bg-dune/10">
                              <div
                                className="h-2 rounded-full bg-dune/50"
                                style={{ width: `${(point.students / chartMax) * 100}%` }}
                              />
                            </div>
                            <div className="rounded-full bg-dune/10">
                              <div
                                className="h-2 rounded-full bg-ember"
                                style={{ width: `${(point.active_learners / chartMax) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex gap-4 text-[11px] uppercase tracking-widest text-dune/45">
                    <span>Gray: new students</span>
                    <span>Amber: active learners</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="glass rounded-3xl p-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-ember" />
                  <h2 className="font-[var(--font-space)] text-xl">Subscription & Billing History</h2>
                </div>
                <div className="mt-5 space-y-3">
                  {institutionOverview.subscriptions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-dune/15 bg-midnight/30 p-6 text-sm text-dune/60">
                      No subscription history is available yet for this institution.
                    </div>
                  ) : (
                    institutionOverview.subscriptions.map((sub) => (
                      <div key={sub.id} className="rounded-2xl border border-dune/10 bg-midnight/30 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-dune">{sub.product_name || sub.plan_code}</p>
                            <p className="mt-1 text-xs uppercase tracking-widest text-dune/45">
                              {sub.product_tier || "custom"} subscription
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[sub.status] || STATUS_STYLES.halted}`}>
                              {sub.status}
                            </span>
                            <p className="mt-2 text-sm font-semibold text-ember">
                              {formatCurrency(sub.price, sub.currency || "INR")}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 text-xs text-dune/60 md:grid-cols-3">
                          <p>Purchased: {formatDate(sub.created_at)}</p>
                          <p>Renewal: {formatDate(sub.current_period_end)}</p>
                          <p>Cancel At: {formatDate(sub.cancel_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-8 border-t border-dune/10 pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-ember">Billing Events</p>
                      <h3 className="mt-2 font-[var(--font-space)] text-lg">Captured payments and purchase trail</h3>
                    </div>
                    <span className="rounded-full border border-dune/15 px-3 py-1 text-xs uppercase tracking-widest text-dune/60">
                      {institutionOverview.payments.length} payments
                    </span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {institutionOverview.payments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-dune/15 bg-midnight/30 p-6 text-sm text-dune/60">
                        No billing events are available yet for this institution.
                      </div>
                    ) : (
                      institutionOverview.payments.map((payment) => (
                        <div key={payment.id} className="rounded-2xl border border-dune/10 bg-midnight/30 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-dune">
                                {payment.product_name || payment.description || payment.plan_code}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-widest text-dune/45">
                                {payment.product_tier || "custom"} purchase
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[payment.status] || STATUS_STYLES.halted}`}>
                                {payment.status}
                              </span>
                              <p className="mt-2 text-sm font-semibold text-ember">
                                {formatCurrency(payment.amount / 100, payment.currency || "INR")}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 text-xs text-dune/60 md:grid-cols-3">
                            <p>Purchased: {formatDate(payment.created_at)}</p>
                            <p>Order: {payment.razorpay_order_id || "-"}</p>
                            <p>Access: {payment.access_status || payment.subscription_status || "pending"}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="glass rounded-3xl p-6">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-ember" />
                    <h2 className="font-[var(--font-space)] text-xl">Institution Snapshot</h2>
                  </div>
                  <div className="mt-5 space-y-4 text-sm text-dune/70">
                    <div className="flex items-center justify-between gap-4">
                      <span>Institution status</span>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[institutionOverview.institution.status] || STATUS_STYLES.halted}`}>
                        {institutionOverview.institution.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Members with access</span>
                      <span className="font-semibold text-dune">{institutionSummary?.active_members ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Paused members</span>
                      <span className="font-semibold text-dune">{institutionSummary?.inactive_members ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Total billing value</span>
                      <span className="font-semibold text-dune">
                        {formatCurrency(institutionSummary?.billing_total ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Invite code</span>
                      <span className="font-mono text-ember">{institutionOverview.institution.code || "-"}</span>
                    </div>
                  </div>
                </div>

                <AuthPanel />
              </div>
            </section>

            <section className="glass rounded-3xl p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-ember">Student Access Control</p>
                  <h2 className="mt-2 font-[var(--font-space)] text-2xl">Monitor student activity and manage access</h2>
                </div>
                <p className="text-sm text-dune/60">
                  Toggle student accounts on or off and watch learning momentum by recent activity.
                </p>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-dune/10 text-[10px] uppercase tracking-[0.25em] text-dune/45">
                      <th className="pb-3 pr-4">Student</th>
                      <th className="pb-3 pr-4">Role</th>
                      <th className="pb-3 pr-4">Progress</th>
                      <th className="pb-3 pr-4">Completed</th>
                      <th className="pb-3 pr-4">Last Active</th>
                      <th className="pb-3 pr-4">Access</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-dune/50">
                          No students are linked to this institution yet.
                        </td>
                      </tr>
                    ) : (
                      topMembers.map((member) => (
                        <tr key={member.id} className="border-b border-dune/5">
                          <td className="py-4 pr-4">
                            <p className="font-semibold text-dune">{member.full_name}</p>
                            <p className="mt-1 text-xs text-dune/50">{member.email}</p>
                          </td>
                          <td className="py-4 pr-4 text-xs text-dune/60">
                            {member.roles?.map((role) => role.name).join(", ") || "student"}
                          </td>
                          <td className="py-4 pr-4">
                            <div className="w-32">
                              <div className="h-2 rounded-full bg-dune/10">
                                <div
                                  className="h-full rounded-full bg-ember"
                                  style={{ width: `${clampPercent(member.progress_percent)}%` }}
                                />
                              </div>
                              <p className="mt-1 text-xs text-dune/50">{member.progress_percent}%</p>
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-dune/70">{member.completed_lessons}</td>
                          <td className="py-4 pr-4 text-xs text-dune/60">
                            {formatDate(member.last_active_at || member.last_learning_at || member.last_login_at)}
                          </td>
                          <td className="py-4 pr-4">
                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[member.status] || STATUS_STYLES.halted}`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => handleMemberAccessToggle(member)}
                              disabled={memberBusyId === member.id}
                              className="rounded-full border border-dune/20 px-3 py-1 text-xs font-semibold text-dune hover:border-ember hover:text-ember disabled:opacity-50"
                            >
                              {memberBusyId === member.id
                                ? "Updating..."
                                : member.status === "active"
                                  ? "Pause Access"
                                  : "Restore Access"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-ember">Licenses & Access</p>
                  <h2 className="mt-2 font-[var(--font-space)] text-2xl">My purchases and access history</h2>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {purchases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-dune/20 bg-midnight/20 p-10 text-center">
                    <p className="text-base font-medium text-dune">No purchases yet</p>
                    <p className="mt-2 max-w-sm text-sm text-dune/60">
                      Purchase a product to unlock library access and see your license history here.
                    </p>
                    <Link
                      href="/pricing"
                      className="mt-5 rounded-full bg-ember px-5 py-2 text-sm font-semibold text-midnight"
                    >
                      View Pricing
                    </Link>
                  </div>
                ) : (
                  purchases.map((purchase) => (
                    <div key={purchase.id} className="rounded-2xl border border-dune/10 bg-midnight/30 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-dune">
                            {purchase.product_name || purchase.plan_code}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-widest text-dune/45">
                            {purchase.product_tier || "custom"} · {purchase.purchase_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[purchase.access_status] || STATUS_STYLES.halted}`}>
                            {purchase.access_status}
                          </span>
                          <p className="mt-2 text-sm font-semibold text-ember">
                            {formatCurrency(purchase.amount / 100, purchase.currency || "INR")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-dune/60">
                        <span>Purchased: {formatDate(purchase.created_at)}</span>
                        <span>Activated: {formatDate(purchase.activated_at)}</span>
                        <span>Payment: {purchase.payment_status}</span>
                      </div>
                      {purchase.subscription_id && (
                        <>
                          {pendingCancelId === purchase.subscription_id ? (
                            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                              <span className="text-dune/60">Cancel this subscription?</span>
                              <button
                                onClick={() => handleCancel(purchase.subscription_id!)}
                                disabled={cancellingId === purchase.subscription_id}
                                className="font-semibold text-red-400 hover:text-red-300 disabled:opacity-50"
                              >
                                {cancellingId === purchase.subscription_id ? "Cancelling..." : "Yes, cancel"}
                              </button>
                              <button
                                onClick={() => setPendingCancelId(null)}
                                className="font-semibold text-dune/60 hover:text-dune"
                              >
                                Keep active
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setPendingCancelId(purchase.subscription_id!)}
                              className="mt-4 text-xs font-semibold text-red-400 hover:text-red-300"
                            >
                              Cancel subscription
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-8 border-t border-dune/10 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-ember">Purchase History</p>
                    <h3 className="mt-2 font-[var(--font-space)] text-xl">Billing and payment activity</h3>
                  </div>
                  <span className="rounded-full border border-dune/15 px-3 py-1 text-xs uppercase tracking-widest text-dune/60">
                    {payments.length} payments
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  {payments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-dune/20 bg-midnight/20 p-8 text-sm text-dune/60">
                      No billing records are attached to your account yet.
                    </div>
                  ) : (
                    payments.map((payment) => (
                      <div key={payment.id} className="rounded-2xl border border-dune/10 bg-midnight/30 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-dune">
                              {payment.product_name || payment.description || payment.plan_code}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-widest text-dune/45">
                              {payment.product_tier || "custom"} purchase
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[payment.status] || STATUS_STYLES.halted}`}>
                              {payment.status}
                            </span>
                            <p className="mt-2 text-sm font-semibold text-ember">
                              {formatCurrency(payment.amount / 100, payment.currency || "INR")}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 text-xs text-dune/60">
                          <span>Purchased: {formatDate(payment.created_at)}</span>
                          <span>Order: {payment.razorpay_order_id || "-"}</span>
                          <span>Access: {payment.access_status || payment.subscription_status || "pending"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <AuthPanel />

              <div className="glass rounded-3xl p-6 border-l-4 border-l-ember/30">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-ember" />
                  <h3 className="font-[var(--font-space)] text-xl">Privacy & Data</h3>
                </div>
                <p className="text-sm text-dune/70 mb-6">
                  Exercise your rights under <span className="text-dune font-semibold">DPDP Act 2023</span>. Manage data portability and account erasure.
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

                  {pendingDeleteAccount ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                      <p className="text-sm text-dune/70">
                        Delete your account permanently? This cannot be undone and all progress will be lost.
                      </p>
                      <div className="mt-3 flex gap-3 text-sm font-semibold">
                        <button onClick={deleteAccount} className="text-red-400 hover:text-red-300">
                          Confirm delete
                        </button>
                        <button onClick={() => setPendingDeleteAccount(false)} className="text-dune/60 hover:text-dune">
                          Keep account
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPendingDeleteAccount(true)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 className="w-4 h-4 text-red-500/40 group-hover:text-red-500 transition-colors" />
                        <span className="text-sm font-medium text-red-500/80 group-hover:text-red-500">Delete Account</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              <div className="glass rounded-3xl p-6">
                <h3 className="font-[var(--font-space)] text-xl mb-4 text-dune">Need Help?</h3>
                <p className="text-sm text-dune/70 mb-4">
                  If you have questions about billing, institution access, or navigating the library, support is ready to help.
                </p>
                <Link href="/contact" className="text-xs uppercase tracking-widest font-semibold text-dune hover:text-ember transition-colors">
                  Contact Support
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
