"use client";

import Link from "next/link";

const FOOTER_LINKS = [
  {
    title: "Platform",
    links: [
      { name: "Home", href: "/" },
      { name: "Pricing", href: "/pricing" },
      { name: "Dashboard", href: "/dashboard" },
      { name: "Admin Settings", href: "/admin" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms & Conditions", href: "/terms" },
      { name: "Disclaimer", href: "/disclaimer" },
      { name: "Cookies Policy", href: "/cookies" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Contact Us", href: "/contact" },
      { name: "Payment Policy", href: "/payment-policy" },
      { name: "Consent", href: "/consent" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-midnight border-t border-dune/10 pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="group flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-ember rounded-xl flex items-center justify-center text-midnight font-bold text-xl shadow-[0_0_20px_rgba(255,107,0,0.3)] group-hover:scale-110 transition-transform">
                DL
              </div>
              <span className="text-xl font-[var(--font-space)] font-bold tracking-tight text-dune">
                Digital<span className="text-ember">Library</span>
              </span>
            </Link>
            <p className="text-sm text-dune/50 leading-relaxed max-w-xs">
              Advanced AI-powered LMS platform for journals, research, and collaborative learning.
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h4 className="font-[var(--font-space)] font-bold text-dune mb-6 text-sm uppercase tracking-widest">
                {group.title}
              </h4>
              <ul className="space-y-4">
                {group.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-dune/40 hover:text-ember transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-dune/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-dune/30">
            © {new Date().getFullYear()} Aether LMS. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] text-dune/20 uppercase tracking-[0.2em]">Powering the Future of Education</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
