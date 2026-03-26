import Link from "next/link";

export const dynamic = "force-dynamic";

export default function InstitutionsInfoPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-ember">Information</p>
          <h1 className="text-4xl font-[var(--font-space)] font-semibold sm:text-5xl">For Institutions</h1>
          <p className="text-lg text-dune/70 max-w-3xl">
            Give students and faculty reliable domain coverage with seat management, access tiers, and unified reporting.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: "Seat-Based Access",
              body: "Allocate access by department, cohort, or program while keeping usage insights transparent.",
            },
            {
              title: "Curriculum Alignment",
              body: "Map domain packs to syllabi and build specialized subdomain coverage when new programs launch.",
            },
            {
              title: "Unified Reporting",
              body: "Track adoption and engagement across your institution with clean, exportable data.",
            },
            {
              title: "Dedicated Support",
              body: "Institution-first onboarding, rollout planning, and success guidance from day one.",
            },
          ].map((item) => (
            <div key={item.title} className="glass rounded-3xl p-6 border border-dune/10">
              <h3 className="text-xl font-[var(--font-space)] mb-2">{item.title}</h3>
              <p className="text-sm text-dune/60 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-dune/15 bg-dune/5 p-8 md:p-10 flex flex-col gap-4">
          <h2 className="text-2xl font-[var(--font-space)]">Build an institution-ready catalog</h2>
          <p className="text-sm text-dune/65 leading-7">
            Start with core domain categories and add subdomains that match your department-level focus areas.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/domains"
              className="rounded-full bg-ember px-6 py-3 text-xs font-bold uppercase tracking-widest text-midnight"
            >
              Explore Domains
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-dune/20 px-6 py-3 text-xs font-bold uppercase tracking-widest text-dune/70 hover:border-dune/40"
            >
              Request a Demo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
