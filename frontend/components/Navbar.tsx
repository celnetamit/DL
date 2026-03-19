"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          <span className="text-ember">D</span>igital Library
        </Link>

        {/* Mobile Toggle */}
        <button
          className="flex items-center p-2 text-dune/60 hover:text-ember transition-colors sm:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle Menu"
        >
          {isMenuOpen ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Main nav links */}
        <div className="hidden items-center gap-6 text-sm uppercase tracking-[0.18em] sm:flex">
          <Link href="/" className={isActive("/")}>
            Home
          </Link>
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

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="border-t border-dune/10 bg-midnight/95 backdrop-blur-xl animate-in slide-in-from-top duration-300 sm:hidden">
          <div className="flex flex-col gap-4 p-6 text-sm font-semibold uppercase tracking-[0.2em]">
            <Link href="/" className={isActive("/")} onClick={() => setIsMenuOpen(false)}>
              Home
            </Link>
            <Link href="/pricing" className={isActive("/pricing")} onClick={() => setIsMenuOpen(false)}>
              Pricing
            </Link>
            <Link href="/dashboard" className={isActive("/dashboard")} onClick={() => setIsMenuOpen(false)}>
              Dashboard
            </Link>
            {isAdmin && (
              <Link href="/admin" className={isActive("/admin")} onClick={() => setIsMenuOpen(false)}>
                Admin
              </Link>
            )}

            <div className="mt-4 flex flex-col gap-4 border-t border-dune/10 pt-6">
              {token && user ? (
                <>
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-bold text-dune/90">{user.full_name || user.email}</span>
                    <span className="text-[10px] text-dune/40">{user.roles?.[0]?.name ?? "member"}</span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="text-left text-red-400 hover:text-red-300 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl bg-ember py-3 text-center text-midnight"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
