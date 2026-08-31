import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import goneViralLogo from "@/app/GoneViral.in logo.png";

const menuLinks = [
  { href: "/", label: "Main board" },
  { href: "/today", label: "Today" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/join", label: "Join the list" },
  { href: "/manage", label: "Manage my listing" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="wordmark" href="/" aria-label="GoneViral.in home">
          <Image
            alt=""
            className="wordmark-logo"
            height={34}
            priority
            src={goneViralLogo}
            width={34}
          />
          <span className="wordmark-text">
            Gone<span>Viral</span>.in
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href={"/manage" as Route}>Manage</Link>
        </nav>
        <div className="header-actions">
          <Link className="button button-primary" href="/join">
            Join the list
          </Link>
        </div>
        <details className="mobile-menu">
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            {menuLinks.map((link) => (
              <Link key={link.href} href={link.href as Route}>
                {link.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
