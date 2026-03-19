import Link from "next/link";
import { AuthView } from "@neondatabase/auth/react";

export default function SignUpPage() {
  return (
    <div className="noise min-h-screen flex items-center justify-center bg-(--surface-0) px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-125 h-125 bg-(--accent) rounded-full opacity-3 blur-2xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-(--accent) flex items-center justify-center">
              <span className="text-(--surface-0) font-bold text-sm font-(family-name:--font-source-serif)">M</span>
            </div>
            <span className="text-xl font-bold text-white font-(family-name:--font-source-serif) tracking-tight">Macrolyst</span>
          </Link>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Create your account</h1>
          <p className="text-sm text-(--text-secondary) mt-1">Start analyzing and trading in minutes</p>
        </div>

        <div className="card-glow p-6">
          <AuthView pathname="sign-up" />
        </div>

        <p className="text-xs text-center text-(--text-secondary) mt-6">
          Not financial advice. For educational and informational purposes only.
        </p>
      </div>
    </div>
  );
}
