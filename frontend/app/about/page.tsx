export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <section className="text-center space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-ember">About Digital Library</p>
          <h1 className="text-4xl font-[var(--font-space)] font-semibold sm:text-5xl">Built for research velocity</h1>
          <p className="text-lg text-dune/70 max-w-3xl mx-auto">
            We curate high-trust content across disciplines so teams can explore, subscribe, and deploy knowledge faster.
            From domain packs to specialized subdomains, everything is designed for modern institutions and agile learners.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Curated Domains",
              body: "Structured collections aligned to academic and professional outcomes, kept current with emerging research.",
            },
            {
              title: "Flexible Access",
              body: "Purchase full domains, targeted subdomains, or single publications depending on your mission.",
            },
            {
              title: "Operational Clarity",
              body: "Transparent pricing, role-based access, and institution-ready workflows out of the box.",
            },
          ].map((item) => (
            <div key={item.title} className="glass rounded-3xl p-6 border border-dune/10">
              <h3 className="text-xl font-[var(--font-space)] mb-2">{item.title}</h3>
              <p className="text-sm text-dune/60 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-dune/15 bg-dune/5 p-8 md:p-10">
          <div className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-[0.3em] text-ember">Our Focus</p>
            <h2 className="text-3xl font-[var(--font-space)] text-dune">A library experience designed for real-world teams</h2>
            <p className="text-sm text-dune/65 leading-7">
              Whether you are scaling institutional access, enabling research groups, or guiding individual learners, we keep the
              signal high and the onboarding simple. Explore domains that match your strategy and add subdomains as your coverage
              expands.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
