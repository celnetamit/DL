import Link from "next/link";

export const dynamic = "force-dynamic";

const INFO_CARDS = [
  {
    title: "For Agencies",
    href: "/information/for-agencies",
    description: "Enable cross-functional teams with curated domain coverage, audit-ready access, and scalable reporting.",
  },
  {
    title: "For Institutions",
    href: "/information/for-institutions",
    description: "Deliver trusted knowledge to departments and cohorts with clear licensing and domain-level controls.",
  },
  {
    title: "For Individuals",
    href: "/information/for-individuals",
    description: "Build your personal learning stack with targeted subdomain packs and rapid discovery tools.",
  },
];

export default function InformationPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <section className="text-center space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-ember">Information</p>
          <h1 className="text-4xl font-[var(--font-space)] font-semibold sm:text-5xl">Choose the path that fits you</h1>
          <p className="text-lg text-dune/70 max-w-3xl mx-auto">
            Whether you are leading procurement, scaling institutional learning, or upskilling independently, we have a curated
            experience tailored to your goals.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {INFO_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="glass rounded-3xl p-6 border border-dune/10 hover:border-ember/40 transition-colors group"
            >
              <h3 className="text-xl font-[var(--font-space)] mb-2 group-hover:text-ember transition-colors">{card.title}</h3>
              <p className="text-sm text-dune/60 leading-relaxed">{card.description}</p>
              <span className="mt-6 inline-flex text-[10px] uppercase tracking-widest font-semibold text-ember/80">Learn more</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
