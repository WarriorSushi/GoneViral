import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { previewRobotsMetadata } from "@/config/seo";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://goneviral.in"),
  title: {
    default: "GoneViral.in | Pay more. Rank higher.",
    template: "%s | GoneViral.in",
  },
  description:
    "Join India’s public paid leaderboard. Confirmed totals determine the order.",
  openGraph: {
    description:
      "Join India’s public paid leaderboard. Confirmed totals determine the order.",
    locale: "en_IN",
    siteName: "GoneViral.in",
    title: "GoneViral.in | Pay more. Rank higher.",
    type: "website",
  },
  robots: previewRobotsMetadata(process.env.VERCEL_ENV),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="site-frame">
          <SiteHeader />
          <div className="route-frame">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
