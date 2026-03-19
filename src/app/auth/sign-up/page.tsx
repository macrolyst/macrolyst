import { AuthView } from "@neondatabase/auth/react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-0)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-source-serif)]">Macrolyst</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">Create your account</p>
        </div>
        <AuthView pathname="sign-up" />
        <p className="text-xs text-center text-[var(--text-secondary)] mt-6">Not financial advice. For educational purposes only.</p>
      </div>
    </div>
  );
}
