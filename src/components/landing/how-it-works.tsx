const steps = [
  {
    step: "01",
    title: "We crunch the data",
    desc: "Every morning before market open, our pipeline fetches prices, fundamentals, news, and macro indicators for 500+ S&P 500 stocks. Technical indicators are calculated, stocks are scored, and the results are published to your dashboard.",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  },
  {
    step: "02",
    title: "You see the picks",
    desc: "Log in to see ranked stock recommendations, sector breakdowns, technical scanner results, and the full catalyst timeline showing what moved the market yesterday. Every data point is transparent -- no black box.",
    icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    step: "03",
    title: "You prove it works",
    desc: "Use paper trading to act on the data. Start a challenge to compete against our algorithm. Track your performance over time. The data either works or it doesn't -- and you'll know for sure.",
    icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 px-6 border-t border-(--border)">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.2em] uppercase text-(--accent) mb-4">How It Works</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-(family-name:--font-source-serif) leading-tight">
            Data in. Decisions out.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={s.step} className="card-glow p-6 sm:p-8 relative overflow-hidden">
              {/* Large background number */}
              <span className="absolute top-4 right-6 text-7xl font-bold text-white/10 font-(family-name:--font-source-serif) select-none">
                {s.step}
              </span>

              <div className="relative">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-(--accent)/10 border border-(--accent)/20 flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-(--accent)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.icon} />
                  </svg>
                </div>

                {/* Step label */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-(--accent)">Step {s.step}</span>
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-px bg-linear-to-r from-(--accent)/20 to-transparent" />
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-white font-(family-name:--font-source-serif) mb-3">
                  {s.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-(--text-secondary) leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
