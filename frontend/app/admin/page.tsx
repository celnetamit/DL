"use client";

export const dynamic = "force-dynamic";

import AdminDashboard from "@/components/AdminDashboard";
import UserManagementPanel from "@/components/UserManagementPanel";
import InstitutionPanel from "@/components/InstitutionPanel";
import SubscriptionAdminPanel from "@/components/SubscriptionAdminPanel";
import DomainManagementPanel from "@/components/DomainManagementPanel";
import ProductManagerPanel from "@/components/ProductManagerPanel";
import SettingsPanel from "@/components/SettingsPanel";
import { useAuth } from "@/lib/auth";
import {
  ROLE_CONTENT_MANAGER,
  ROLE_SUBSCRIPTION_MANAGER,
  ROLE_SUPER_ADMIN,
  hasAnyRole,
} from "@/lib/roles";
import { useEffect, useMemo, useState } from "react";

const TABS = ["Analytics", "Users", "Institutions", "Subscriptions", "Domains", "Products", "Settings"] as const;
type Tab = typeof TABS[number];

const TAB_RULES: Record<Tab, string[]> = {
  Analytics: [ROLE_SUPER_ADMIN, ROLE_SUBSCRIPTION_MANAGER, ROLE_CONTENT_MANAGER],
  Users: [ROLE_SUPER_ADMIN, ROLE_SUBSCRIPTION_MANAGER],
  Institutions: [ROLE_SUPER_ADMIN, ROLE_SUBSCRIPTION_MANAGER],
  Subscriptions: [ROLE_SUPER_ADMIN, ROLE_SUBSCRIPTION_MANAGER],
  Domains: [ROLE_SUPER_ADMIN, ROLE_CONTENT_MANAGER],
  Products: [ROLE_SUPER_ADMIN, ROLE_CONTENT_MANAGER],
  Settings: [ROLE_SUPER_ADMIN],
};

export default function AdminPage() {
  const { token, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Analytics");
  const roleNames = useMemo(() => (user?.roles || []).map((role) => role.name), [user?.roles]);
  const availableTabs = useMemo(
    () => TABS.filter((tab) => hasAnyRole(roleNames, TAB_RULES[tab])),
    [roleNames],
  );

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [activeTab, availableTabs]);

  if (loading) {
    return <main className="min-h-screen px-6 py-10">Loading admin permissions...</main>;
  }

  if (!token || availableTabs.length === 0) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-dune/10 bg-midnight/40 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-ember">Restricted</p>
          <h1 className="mt-3 font-[var(--font-space)] text-3xl">Admin access is role-based</h1>
          <p className="mt-3 text-sm text-dune/65">
            This area is available to `super_admin`, `subscription_manager`, and `content_manager` accounts.
            Institution admins should use the main dashboard for institution-level controls.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 min-w-0 line-clamp-none">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 min-w-0">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-ember">Admin Command Center</p>
          <h1 className="font-[var(--font-space)] text-3xl">Institution, Subscription & Content Operations</h1>
        </header>

        {/* Tab Nav */}
        <nav className="flex gap-2 flex-wrap border-b border-dune/10 pb-2">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition ${
                activeTab === tab
                  ? "bg-ember text-midnight"
                  : "text-dune/60 hover:text-dune border border-dune/20"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        {activeTab === "Analytics" && <AdminDashboard />}
        {activeTab === "Users" && <UserManagementPanel token={token} />}
        {activeTab === "Institutions" && <InstitutionPanel token={token} />}
        {activeTab === "Subscriptions" && <SubscriptionAdminPanel token={token} />}
        {activeTab === "Domains" && <DomainManagementPanel />}
        {activeTab === "Products" && <ProductManagerPanel />}
        {activeTab === "Settings" && <SettingsPanel />}
      </div>
    </main>
  );
}
