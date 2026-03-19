"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    authClient.signOut().then(() => {
      router.push("/");
    });
  }, [router]);

  return null;
}
