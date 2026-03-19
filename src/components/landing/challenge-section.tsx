import Link from "next/link";

export function ChallengeSection() {
  return (
    <section className="py-20 sm:py-28 px-6 border-t border-(--border) relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-(--accent) rounded-full opacity-3 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: content */}
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-(--accent) mb-4">Challenge Mode</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-(family-name:--font-source-serif) leading-tight mb-6">
              Think you can beat<br />the algorithm?
            </h2>
            <p className="text-(--text-secondary) leading-relaxed mb-8">
              Start a challenge, pick your own stocks, and go head-to-head against our scoring algorithm.
              Track performance daily with a side-by-side chart. At the end, the numbers speak for themselves.
            </p>
            <div className="space-y-4 mb-8">
              {[
                { duration: "7 days", desc: "Quick sprint. Test a thesis." },
                { duration: "14 days", desc: "Standard challenge. Enough time for real moves." },
                { duration: "30 days", desc: "Full month. Separates skill from luck." },
              ].map((c) => (
                <div key={c.duration} className="flex items-center gap-4 p-4 rounded-lg bg-(--surface-1) border border-(--border)">
                  <span className="text-sm font-bold text-(--accent) font-(family-name:--font-source-serif) w-16 shrink-0">{c.duration}</span>
                  <span className="text-sm text-(--text-secondary)">{c.desc}</span>
                </div>
              ))}
            </div>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 bg-(--accent) text-(--surface-0) px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Start Your First Challenge
            </Link>
          </div>

          {/* Right: mockup */}
          <div className="card-glow p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Active Challenge</p>
                <p className="text-lg font-bold text-white font-(family-name:--font-source-serif) mt-1">14-Day Sprint</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-(--up)/10 text-(--up) border border-(--up)/20">
                Day 8 of 14
              </span>
            </div>

            {/* Fake performance chart */}
            <div className="h-48 flex items-end gap-0.5 mb-6 p-4 rounded-lg bg-(--surface-2)/30 border border-(--border)">
              {Array.from({ length: 8 }, (_, i) => {
                const userH = 30 + Math.sin(i * 0.8) * 20 + i * 5;
                const algoH = 25 + Math.cos(i * 0.6) * 15 + i * 4;
                return (
                  <div key={i} className="flex-1 flex gap-0.5 items-end h-full">
                    <div className="flex-1 rounded-sm bg-(--accent)/60" style={{ height: `${userH}%` }} />
                    <div className="flex-1 rounded-sm bg-(--text-secondary)/30" style={{ height: `${algoH}%` }} />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-(--surface-2)/50 border border-(--border) text-center">
                <p className="text-xs text-(--text-secondary) mb-1">Your Return</p>
                <p className="text-xl font-bold text-(--up) font-(family-name:--font-source-serif)">+4.2%</p>
              </div>
              <div className="p-4 rounded-lg bg-(--surface-2)/50 border border-(--border) text-center">
                <p className="text-xs text-(--text-secondary) mb-1">Algorithm</p>
                <p className="text-xl font-bold text-(--accent) font-(family-name:--font-source-serif)">+3.1%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
