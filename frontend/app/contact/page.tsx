import { Metadata } from "next";
import ContactClient from "@/components/ContactClient";

export const metadata: Metadata = {
  title: "Contact Us | Digital Library",
  description: "Get in touch with our team for support or inquiries about our digital library services.",
};

export default function ContactPage() {
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

          {/* Contact Form Component */}
          <ContactClient />
        </div>
      </div>
    </main>
  );
}
