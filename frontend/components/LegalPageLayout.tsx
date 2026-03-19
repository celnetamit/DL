"use client";

import { ReactNode } from "react";
import Link from "next/link";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
  sections: { id: string; title: string }[];
}

export default function LegalPageLayout({
  title,
  lastUpdated,
  children,
  sections,
}: LegalPageLayoutProps) {
  return (
    <main className="bg-midnight min-h-screen py-24">
      <div className="container mx-auto px-6 max-w-5xl">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-dune/30 uppercase tracking-widest mb-12">
          <Link href="/" className="hover:text-ember transition-colors">Home</Link>
          <span>/</span>
          <span className="text-dune/60 font-bold">{title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-16">
          {/* Main Content */}
          <div className="flex-1">
            <header className="mb-16">
              <h1 className="text-5xl md:text-6xl font-[var(--font-space)] font-bold text-dune mb-6 tracking-tight">
                {title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-dune/40">
                <span className="bg-dune/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Legal Document</span>
                <span>Last Updated: {lastUpdated}</span>
              </div>
            </header>

            <div className="prose prose-invert prose-dune max-w-none 
              prose-headings:font-[var(--font-space)] prose-headings:font-bold prose-headings:text-dune
              prose-p:text-dune/70 prose-p:leading-relaxed prose-p:text-lg
              prose-li:text-dune/70 prose-li:text-lg
              prose-strong:text-dune prose-strong:font-bold
              prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:pb-4 prose-h2:border-b prose-h2:border-dune/10
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
            ">
              {children}
            </div>
          </div>

          {/* Sticky Sidebar / TOC */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-32">
              <h4 className="font-[var(--font-space)] font-bold text-dune mb-6 text-sm uppercase tracking-widest bg-dune/5 p-4 rounded-lg border border-dune/10">
                On this page
              </h4>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block py-2 px-4 text-sm text-dune/40 hover:text-ember hover:bg-dune/5 rounded-md transition-all border-l-2 border-transparent hover:border-ember"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className="mt-12 p-6 bg-ember/5 rounded-2xl border border-ember/20">
                <h5 className="font-bold text-dune mb-2 text-sm">Need help?</h5>
                <p className="text-xs text-dune/50 mb-4 leading-relaxed">
                  If you have questions about our policies, please reach out to our team.
                </p>
                <Link 
                  href="/contact"
                  className="inline-block text-xs font-bold text-ember hover:underline"
                >
                  Contact Support →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
