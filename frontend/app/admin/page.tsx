"use client";

import AdminDashboard from "@/components/AdminDashboard";
import UserManagementPanel from "@/components/UserManagementPanel";
import InstitutionPanel from "@/components/InstitutionPanel";
import SubscriptionAdminPanel from "@/components/SubscriptionAdminPanel";
import DomainManagementPanel from "@/components/DomainManagementPanel";
import ProductManagerPanel from "@/components/ProductManagerPanel";
import SettingsPanel from "@/components/SettingsPanel";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const TABS = ["Analytics", "Users", "Institutions", "Subscriptions", "Domains", "Products", "Settings"] as const;
type Tab = typeof TABS[number];

export default function AdminPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Analytics");

  return (
    <main className="min-h-screen px-6 py-10 min-w-0 line-clamp-none">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 min-w-0">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-ember">Admin View</p>
          <h1 className="font-[var(--font-space)] text-3xl">Content Operations</h1>
        </header>

        {/* Tab Nav */}
        <nav className="flex gap-2 flex-wrap border-b border-dune/10 pb-2">
          {TABS.map((tab) => (
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

