"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    // Simulate API call
    setTimeout(() => {
      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  return (
    <main className="bg-midnight min-h-screen py-24">
      <div className="container mx-auto px-6 max-w-6xl">
        <header className="mb-20 text-center">
          <h1 className="text-6xl md:text-7xl font-[var(--font-space)] font-bold text-dune mb-6 tracking-tight">
            Get in <span className="text-ember">Touch</span>
          </h1>
          <p className="text-xl text-dune/50 max-w-2xl mx-auto leading-relaxed font-light">
            Have questions about our journals, library access, or your account? We're here to help you navigate the future of learning.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          {/* Contact Details */}
          <div className="space-y-12">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-ember font-bold mb-6">Contact Information</h3>
              <div className="space-y-6">
                <div className="group">
                  <p className="text-xs text-dune/30 uppercase mb-2">Email Inquiries</p>
                  <a href="mailto:info@stmjournals.com" className="text-2xl font-medium text-dune hover:text-ember transition-colors">
                    info@stmjournals.com
                  </a>
                </div>
                <div className="group">
                  <p className="text-xs text-dune/30 uppercase mb-2">Phone Support</p>
                  <p className="text-2xl font-medium text-dune">
                    +91-0120-4781200 / 206
                  </p>
                </div>
                <div className="group">
                  <p className="text-xs text-dune/30 uppercase mb-2">Mobile & WhatsApp</p>
                  <p className="text-2xl font-medium text-dune">
                    +91-98100 78958
                  </p>
                  <p className="text-xs text-dune/40 mt-1">Mon-Sat: 10AM - 6PM IST</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-ember font-bold mb-6">Head Office</h3>
              <div className="p-8 bg-dune/5 rounded-3xl border border-dune/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-ember/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                <p className="text-lg text-dune/70 leading-relaxed relative z-10">
                  A-118 1st Floor, Sector 63,<br />
                  Noida, Uttar Pradesh,<br />
                  India - 201301
                </p>
              </div>
            </div>

            <div className="pt-8 flex items-center gap-4 text-xs text-dune/30">
              <span className="w-1.5 h-1.5 bg-ember rounded-full animate-pulse" />
              <span>Typical response time: Under 24 hours</span>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-dune/5 p-10 md:p-12 rounded-[2.5rem] border border-dune/10 shadow-2xl backdrop-blur-sm relative">
            <h3 className="text-3xl font-[var(--font-space)] font-bold text-dune mb-8">Send us a Message</h3>
            
            {status === "success" ? (
              <div className="py-20 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-ember/20 text-ember rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-dune mb-2">Message Sent!</h4>
                <p className="text-dune/50">We'll get back to you shortly.</p>
                <button 
                  onClick={() => setStatus("idle")}
                  className="mt-8 text-ember font-bold text-sm hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-dune/40 font-bold ml-1">Full Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-midnight/50 border border-dune/10 rounded-2xl p-4 text-dune focus:border-ember focus:ring-1 focus:ring-ember outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-dune/40 font-bold ml-1">Email Address</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-midnight/50 border border-dune/10 rounded-2xl p-4 text-dune focus:border-ember focus:ring-1 focus:ring-ember outline-none transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-dune/40 font-bold ml-1">Subject</label>
                  <input
                    required
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-midnight/50 border border-dune/10 rounded-2xl p-4 text-dune focus:border-ember focus:ring-1 focus:ring-ember outline-none transition-all"
                    placeholder="Subscription Inquiry"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-dune/40 font-bold ml-1">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-midnight/50 border border-dune/10 rounded-2xl p-4 text-dune focus:border-ember focus:ring-1 focus:ring-ember outline-none transition-all resize-none"
                    placeholder="How can we help you?"
                  />
                </div>
                <button
                  disabled={status === "submitting"}
                  className="w-full bg-ember hover:bg-ember/90 text-midnight font-bold py-5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-[0_10px_30px_rgba(255,107,0,0.3)]"
                >
                  {status === "submitting" ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
