"use client";

import { useState } from "react";
import { submitContactLead } from "@/lib/api";

export default function ContactClient() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    institution_name: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      await submitContactLead(formData);
      setStatus("success");
      setFormData({ full_name: "", email: "", phone: "", institution_name: "", subject: "", message: "" });
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error?.message || "We could not submit your message right now.");
    }
  };

  return (
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
              <label htmlFor="name" className="text-xs uppercase tracking-widest text-dune/40 font-bold ml-1">Full Name</label>
              <input
                id="name"
                required
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-midnight/50 border border-dune/10 rounded-2xl p-4 text-dune focus:border-ember focus:ring-1 focus:ring-ember outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs uppercase tracking-widest text-dune/40 font-bold ml-1">Email Address</label>
              <input
                id="email"
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-midnight/50 border border-dune/10 rounded-2xl p-4 text-dune focus:border-ember focus:ring-1 focus:ring-ember outline-none transition-all"
                placeholder="john@example.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-xs uppercase tracking-widest text-dune/40 font-bold ml-1">Phone</label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-midnight/50 border border-dune/10 rounded-2xl p-4 text-dune focus:border-ember focus:ring-1 focus:ring-ember outline-none transition-all"
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="institution_name" className="text-xs uppercase tracking-widest text-dune/40 font-bold ml-1">Institution</label>
              <input
                id="institution_name"
                type="text"
                value={formData.institution_name}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                className="w-full bg-midnight/50 border border-dune/10 rounded-2xl p-4 text-dune focus:border-ember focus:ring-1 focus:ring-ember outline-none transition-all"
                placeholder="Your institution or company"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="subject" className="text-xs uppercase tracking-widest text-dune/40 font-bold ml-1">Subject</label>
            <input
              id="subject"
              required
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full bg-midnight/50 border border-dune/10 rounded-2xl p-4 text-dune focus:border-ember focus:ring-1 focus:ring-ember outline-none transition-all"
              placeholder="Subscription Inquiry"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="message" className="text-xs uppercase tracking-widest text-dune/40 font-bold ml-1">Message</label>
            <textarea
              id="message"
              required
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full bg-midnight/50 border border-dune/10 rounded-2xl p-4 text-dune focus:border-ember focus:ring-1 focus:ring-ember outline-none transition-all resize-none"
              placeholder="How can we help you?"
            />
          </div>
          {status === "error" && (
            <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </p>
          )}
          <button
            disabled={status === "submitting"}
            className="w-full bg-ember hover:bg-ember/90 text-midnight font-bold py-5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-[0_10px_30px_rgba(255,107,0,0.3)]"
          >
            {status === "submitting" ? "Sending..." : "Send Message"}
          </button>
        </form>
      )}
    </div>
  );
}
