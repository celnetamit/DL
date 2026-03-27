"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";

import AdminDashboard from "@/components/AdminDashboard";
import { useAuth } from "@/lib/auth";
import { ROLE_CONTENT_MANAGER, ROLE_SUPER_ADMIN, hasAnyRole } from "@/lib/roles";

export default function ContentManagerPage() {
  const { token, user, loading } = useAuth();
  const roleNames = (user?.roles || []).map((role) => role.name);
  const canManageContent = hasAnyRole(roleNames, [ROLE_CONTENT_MANAGER, ROLE_SUPER_ADMIN]);

  if (loading) {
    return <main className="min-h-screen px-6 py-10">Loading content operations...</main>;
  }

  if (!token || !canManageContent) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-dune/10 bg-midnight/40 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-ember">Restricted</p>
          <h1 className="mt-3 font-[var(--font-space)] text-3xl">Content operations are role-based</h1>
          <p className="mt-3 text-sm text-dune/65">
            This page is available to `content_manager` and `super_admin` accounts.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-full border border-dune/20 px-5 py-2 text-sm text-dune hover:border-ember hover:text-ember transition-colors"
          >
            Back to Admin
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 min-w-0">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 min-w-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ember">Content Operations</p>
            <h1 className="font-[var(--font-space)] text-3xl">Dedicated Content Manager</h1>
            <p className="mt-2 text-sm text-dune/65">
              Manage your entire content library with focused filters, inline updates, and bulk edit controls.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-dune/20 px-4 py-2 text-sm text-dune hover:border-ember hover:text-ember transition-colors"
          >
            Back to Admin
          </Link>
        </header>

        <AdminDashboard standalone />
      </div>
    </main>
  );
}
