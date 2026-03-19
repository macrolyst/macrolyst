import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { StatsBar } from "@/components/landing/stats-bar";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { DataSources } from "@/components/landing/data-sources";
import { ChallengeSection } from "@/components/landing/challenge-section";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Macrolyst - S&P 500 Market Analysis & Paper Trading",
  description:
    "Daily S&P 500 analysis with technical scoring, paper trading, and challenge mode. Prove the data works by competing against the algorithm. Free forever.",
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
    title: "Macrolyst - Market Analysis You Can Prove",
    description:
      "Daily S&P 500 analysis, paper trading engine, and challenge mode. See our picks and prove if they work.",
    type: "website",
    url: "https://macrolyst.com",
    siteName: "Macrolyst",
  },
  twitter: {
    card: "summary_large_image",
    title: "Macrolyst - Market Analysis You Can Prove",
    description:
      "S&P 500 scoring, technical scanners, paper trading, and challenge mode. Free forever.",
  },
};

export default async function Home() {
  const session = await auth.getSession();
  if (session?.data?.user) redirect("/dashboard");

  return (
    <div className="noise min-h-screen bg-(--surface-0)">
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <DataSources />
      <ChallengeSection />
      <Pricing />
      <Faq />
      <Cta />
      <Footer />
    </div>
  );
}
