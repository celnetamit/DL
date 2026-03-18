"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href ? "text-ember" : "text-dune/70 hover:text-dune transition";

  const isAdmin = user?.roles?.some((r) => r.name === "super_admin");
  const isInstructor =
    user?.roles?.some((r) => r.name === "instructor") || isAdmin;

  return (
    <nav className="sticky top-0 z-50 border-b border-dune/10 bg-midnight/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Brand */}
        <Link
          href="/"
          className="font-[var(--font-space)] text-xl font-semibold tracking-tight"
        >
          <span className="text-ember">A</span>ether LMS
        </Link>

        {/* Main nav links */}
        <div className="hidden items-center gap-6 text-sm uppercase tracking-[0.18em] sm:flex">
          <Link href="/pricing" className={isActive("/pricing")}>
            Pricing
          </Link>
          <Link href="/dashboard" className={isActive("/dashboard")}>
            Dashboard
          </Link>
          {isAdmin && (
            <Link href="/admin" className={isActive("/admin")}>
              Admin
            </Link>
          )}
        </div>

        {/* Auth section */}
        <div className="flex items-center gap-3 text-sm">
          {token && user ? (
            <>
              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-xs font-semibold text-dune/90 max-w-[140px] truncate">
                  {user.full_name || user.email}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-dune/50">
                  {user.roles?.[0]?.name ?? "member"}
                  {user.institution_id && " · Institution"}
                </span>
              </div>
              <button
                onClick={logout}
                className="rounded-full border border-dune/30 px-4 py-1.5 text-xs text-dune/70 hover:border-red-400 hover:text-red-400 transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-full bg-ember px-5 py-2 text-xs font-semibold text-midnight hover:opacity-90 transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
