"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Pricing", href: "/pricing" },
  { name: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { token, user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
        isScrolled ? "bg-midnight/80 py-4 backdrop-blur-xl border-b border-dune/10 shadow-lg" : "bg-transparent py-8"
      }`}
      aria-label="Main Navigation"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3" aria-label="Digital Library Home">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember text-xl font-bold text-midnight transition-transform group-hover:scale-110">
            DL
          </div>
          <span className="font-[var(--font-space)] text-xl font-bold tracking-tight text-dune">
            Digital<span className="text-ember">Library</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          <div className="flex items-center gap-2 rounded-full border border-dune/10 bg-dune/5 px-2 py-1.5 backdrop-blur-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                  pathname === link.href
                    ? "bg-ember text-midnight shadow-md shadow-ember/20"
                    : "text-dune/40 hover:text-dune hover:bg-dune/5"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="h-6 w-px bg-dune/10 mx-2"></div>

          {token ? (
            <div className="flex items-center gap-4">
               <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-dune/40 font-bold">Welcome back</p>
                  <p className="text-xs font-bold text-dune">{user?.full_name?.split(' ')[0] || 'User'}</p>
               </div>
               <button
                  onClick={logout}
                  className="rounded-full border border-ember/30 bg-ember/5 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-ember transition-all hover:bg-ember hover:text-midnight hover:scale-105 active:scale-95"
                >
                  Sign Out
                </button>
            </div>
          ) : (
            <Link
              href="/dashboard?auth=login"
              className="rounded-full bg-ember px-8 py-3 text-xs font-bold uppercase tracking-widest text-midnight transition-all hover:scale-105 hover:bg-white active:scale-95 shadow-lg shadow-ember/20"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden text-dune p-2 hover:bg-dune/10 rounded-lg transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 top-0 z-[-1] min-h-screen w-full bg-midnight/95 backdrop-blur-2xl transition-all duration-500 lg:hidden ${
          isMobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex h-full flex-col items-center justify-center gap-12 p-8">
          <div className="flex flex-col items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-2xl font-[var(--font-space)] font-bold transition-all ${
                  pathname === link.href ? "text-ember scale-110" : "text-dune/40 hover:text-dune hover:scale-105"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          <div className="w-24 h-px bg-dune/10"></div>

          {token ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-dune/40 italic mb-2">{user?.email}</p>
              <button
                onClick={logout}
                className="w-full rounded-full border border-ember/30 bg-ember/10 px-12 py-4 text-sm font-bold uppercase tracking-widest text-ember transition-all hover:bg-ember hover:text-midnight"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/dashboard?auth=register"
              className="w-full rounded-full bg-ember px-12 py-4 text-center text-sm font-bold uppercase tracking-widest text-midnight transition-transform hover:scale-105 shadow-xl shadow-ember/30"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
