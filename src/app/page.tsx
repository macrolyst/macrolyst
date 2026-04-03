import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { StatsBar } from "@/components/landing/stats-bar";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { DataSources } from "@/components/landing/data-sources";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Macrolyst - S&P 500 Market Analysis & Paper Trading",
  description:
    "Free S&P 500 analysis with real-time prices, market screeners, technical scanners, and paper trading. Educational platform for learning to trade. Not financial advice.",
  keywords: [
    "stock market analysis",
    "S&P 500",
    "paper trading",
    "technical analysis",
    "RSI",
    "MACD",
    "stock screener",
    "market intelligence",
    "stock scoring",
    "trading simulator",
  ],
  openGraph: {
    title: "Macrolyst - S&P 500 Analysis & Paper Trading",
    description:
      "Free S&P 500 analysis, real-time prices, market screeners, and paper trading. Educational platform for learning to trade.",
    type: "website",
    url: "https://macrolyst.com",
    siteName: "Macrolyst",
  },
  twitter: {
    card: "summary_large_image",
    title: "Macrolyst - S&P 500 Analysis & Paper Trading",
    description:
      "Free S&P 500 analysis, real-time prices, market screeners, and paper trading for learning.",
  },
};

export default async function Home() {
  const cookieStore = await cookies();
  const hasSession =
    cookieStore.has("__Secure-neon-auth.session_token") ||
    cookieStore.has("neon-auth.session_token");
  if (hasSession) redirect("/dashboard");

  return (
    <div className="noise min-h-screen bg-(--surface-0)">
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <DataSources />
      <Pricing />
      <Faq />
      <Cta />
      <Footer />
    </div>
  );
}
