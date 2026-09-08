import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  SITE_ORIGIN,
  SOCIAL_PREVIEW_IMAGE,
  previewRobotsMetadata,
} from "@/config/seo";

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
  applicationName: "GoneViral.in",
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "GoneViral.in | Pay more. Rank higher.",
    template: "%s | GoneViral.in",
  },
  description:
    "Join India’s public paid leaderboard. Confirmed totals determine the order.",
  openGraph: {
    description:
      "Join India’s public paid leaderboard. Confirmed totals determine the order.",
    images: [SOCIAL_PREVIEW_IMAGE],
    locale: "en_IN",
    siteName: "GoneViral.in",
    title: "GoneViral.in | Pay more. Rank higher.",
    type: "website",
    url: SITE_ORIGIN,
  },
  robots: previewRobotsMetadata(process.env.VERCEL_ENV),
  twitter: {
    card: "summary_large_image",
    description:
      "Join India’s public paid leaderboard. Confirmed totals determine the order.",
    images: [SOCIAL_PREVIEW_IMAGE],
    title: "GoneViral.in | Pay more. Rank higher.",
  },
};

export default function RootLayout({
  children,
  howModal,
  joinModal,
}: Readonly<{
  children: React.ReactNode;
  howModal: React.ReactNode;
  joinModal: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div id="site-content">
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <div className="site-frame">
            <SiteHeader />
            <div className="route-frame">{children}</div>
            <SiteFooter />
          </div>
        </div>
        {howModal}
        {joinModal}
      </body>
    </html>
  );
}
