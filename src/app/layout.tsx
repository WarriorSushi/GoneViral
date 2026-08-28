import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

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
    default: "GoneViral.in | A paid list for makers",
    template: "%s | GoneViral.in",
  },
  description: "Show your work. Pay to move up the list.",
  openGraph: {
    description: "Show your work. Pay to move up the list.",
    locale: "en_IN",
    siteName: "GoneViral.in",
    title: "GoneViral.in | A paid list for makers",
    type: "website",
  },
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
