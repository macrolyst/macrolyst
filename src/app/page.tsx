import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export default async function Home() {
  const session = await auth.getSession();
  if (session?.data?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-0)] px-4">
      <h1 className="text-5xl sm:text-6xl font-bold text-white font-[family-name:var(--font-source-serif)] text-center">
        Macrolyst
      </h1>
      <p className="mt-4 text-lg text-[var(--text-secondary)] text-center max-w-md">
        S&P 500 analysis, paper trading, and challenge mode.
        Prove the data works -- or beat it yourself.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/auth/sign-up"
          className="rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--surface-0)] hover:opacity-90 transition-opacity"
        >
          Get Started
        </Link>
        <Link
          href="/auth/sign-in"
          className="rounded-lg bg-[var(--surface-1)] border border-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-[var(--surface-2)] transition-colors"
        >
          Sign In
        </Link>
      </div>
      <p className="mt-12 text-xs text-[var(--text-secondary)]">
        Not financial advice. For educational and informational purposes only.
      </p>
    </div>
  );
}
