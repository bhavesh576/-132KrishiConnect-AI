import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import TopBar from "@/components/layout/TopBar";
import FooterDisclaimer from "@/components/layout/FooterDisclaimer";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";

// IBM Plex Sans (India Stack look) + Noto Sans Devanagari for HI/MR glyphs —
// self-hosted variable fonts so no runtime font CDN dependency.
const plex = localFont({
  src: "../fonts/IBMPlexSans.ttf",
  variable: "--font-plex",
  weight: "100 900",
  display: "swap",
});
const noto = localFont({
  src: "../fonts/NotoSansDevanagari.ttf",
  variable: "--font-noto",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KrishiConnect — Govt. of Maharashtra Pilot | MSInS",
  description:
    "Market linkage and price discovery prototype for farmers — SIH 2026 PS #26132. Synthetic demo data; real, transparent formulas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plex.variable} ${noto.variable} font-sans`}>
        <LanguageProvider>
          <TopBar />
          <main className="min-h-[calc(100vh-96px)]">{children}</main>
          <FooterDisclaimer />
        </LanguageProvider>
      </body>
    </html>
  );
}
