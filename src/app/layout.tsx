import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "Macrolyst",
  description: "Stock market analysis and paper trading platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${dmSans.variable} ${sourceSerif.variable}`}>
      <body className="bg-[#0B1120] text-[#f0ede6] antialiased font-[family-name:var(--font-dm-sans)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
