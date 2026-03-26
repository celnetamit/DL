import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AgenciesInfoPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-ember">Information</p>
          <h1 className="text-4xl font-[var(--font-space)] font-semibold sm:text-5xl">For Agencies</h1>
          <p className="text-lg text-dune/70 max-w-3xl">
            Equip agency teams with domain-focused packs, rapid onboarding, and compliance-friendly access controls.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: "Cross-Team Access",
              body: "Assign domains by department, reduce silos, and ensure everyone works from the same verified sources.",
            },
            {
              title: "Procurement Ready",
              body: "Streamlined purchasing workflows for multi-seat access, with clean audit trails and reporting.",
            },
            {
              title: "Curated Coverage",
              body: "Expand coverage quickly with subdomain packs aligned to emerging mandates or policy shifts.",
            },
            {
              title: "Account Support",
              body: "Dedicated guidance on rollouts, adoption, and success metrics for program leads.",
            },
          ].map((item) => (
            <div key={item.title} className="glass rounded-3xl p-6 border border-dune/10">
              <h3 className="text-xl font-[var(--font-space)] mb-2">{item.title}</h3>
              <p className="text-sm text-dune/60 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-dune/15 bg-dune/5 p-8 md:p-10 flex flex-col gap-4">
          <h2 className="text-2xl font-[var(--font-space)]">Start with the right domain mix</h2>
          <p className="text-sm text-dune/65 leading-7">
            Browse domains to map coverage to your active programs. Expand with targeted subdomains as new initiatives emerge.
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
              Talk to Us
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
