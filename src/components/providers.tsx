"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import "@neondatabase/auth/ui/tailwind";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      // @ts-expect-error -- Neon Auth type mismatch between internal better-fetch versions
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.push("/dashboard")}
      Link={Link}
      defaultTheme="dark"
    >
      {children}
    </NeonAuthUIProvider>
  );
}
