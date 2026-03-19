"use client";

import { useCompliance } from "@/hooks/useCompliance";
import Link from "next/link";
import { ShieldCheck, Info } from "lucide-react";

export default function ConsentBanner() {
  const { consentGiven, acceptConsent } = useCompliance();

  if (consentGiven === true || consentGiven === null) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-4xl animate-in slide-in-from-bottom-10 fade-in duration-700 delay-500 fill-mode-both">
      <div className="bg-midnight/80 backdrop-blur-2xl border border-ember/20 rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(255,107,0,0.15)] flex flex-col md:flex-row items-center gap-6 md:gap-12 overflow-hidden relative group">
        {/* Decorative Background Elements */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-ember/10 rounded-full blur-3xl opacity-20" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-ember/5 rounded-full blur-3xl opacity-20" />
        
        <div className="flex-1 space-y-3 relative">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ember/20 rounded-lg text-ember">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-[var(--font-space)] font-bold text-dune">Your Privacy Matters</h4>
          </div>
          <p className="text-sm text-dune/60 leading-relaxed font-light">
            We use essential cookies to ensure our platform functions securely. By continuing, you agree to our 
            <Link href="/privacy" className="text-ember hover:underline mx-1">Privacy Policy</Link> 
            pursuant to the <span className="text-dune font-semibold">DPDP Act 2023</span>.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 relative">
          <Link 
            href="/cookies"
            className="px-5 py-3 text-xs font-bold text-dune/40 hover:text-ember transition-colors flex items-center gap-2 group/btn"
          >
            <Info className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
            Learn More
          </Link>
          <button 
            onClick={acceptConsent}
            className="bg-ember hover:bg-ember/90 text-midnight font-bold px-8 py-3.5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-ember/20"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
