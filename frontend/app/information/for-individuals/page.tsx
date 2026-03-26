import Link from "next/link";

export const dynamic = "force-dynamic";

export default function IndividualsInfoPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-ember">Information</p>
          <h1 className="text-4xl font-[var(--font-space)] font-semibold sm:text-5xl">For Individuals</h1>
          <p className="text-lg text-dune/70 max-w-3xl">
            Build your own knowledge stack with focused domains, flexible access, and curated pathways.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: "Focused Learning",
              body: "Pick subdomains that match your immediate goals and expand at your own pace.",
            },
            {
              title: "Practical Content",
              body: "Access publications, journals, and multimedia content built for applied learning.",
            },
            {
              title: "Budget Friendly",
              body: "Pay for exactly what you need, from single domains to wider bundles.",
            },
            {
              title: "Always Growing",
              body: "Fresh content and new subdomains keep your learning current.",
            },
          ].map((item) => (
            <div key={item.title} className="glass rounded-3xl p-6 border border-dune/10">
              <h3 className="text-xl font-[var(--font-space)] mb-2">{item.title}</h3>
              <p className="text-sm text-dune/60 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-dune/15 bg-dune/5 p-8 md:p-10 flex flex-col gap-4">
          <h2 className="text-2xl font-[var(--font-space)]">Find your next domain</h2>
          <p className="text-sm text-dune/65 leading-7">
            Browse the domain catalog and discover subdomains aligned to your learning path.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/domains"
              className="rounded-full bg-ember px-6 py-3 text-xs font-bold uppercase tracking-widest text-midnight"
            >
              Explore Domains
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-dune/20 px-6 py-3 text-xs font-bold uppercase tracking-widest text-dune/70 hover:border-dune/40"
            >
              View Pricing
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
