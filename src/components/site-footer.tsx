import Image from "next/image";
import Link from "next/link";

import goneViralLogo from "@/app/GoneViral.in logo.png";

const exploreLinks = [
  { href: "/", label: "Leaderboard" },
  { href: "/today", label: "Daily" },
  { href: "/how-it-works", label: "How it works" },
] as const;

const listingLinks = [
  { href: "/join", label: "Get listed" },
  { href: "/manage", label: "Manage listing" },
  { href: "/paid-placement", label: "Paid placement" },
] as const;

const supportLinks = [
  { href: "/contact", label: "Contact / report abuse" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/content-policy", label: "Content policy" },
  { href: "/copyright", label: "Copyright / trademark" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link
          aria-label="GoneViral.in home"
          className="wordmark footer-wordmark"
          href="/"
        >
          <Image
            alt=""
            className="wordmark-logo"
            height={34}
            src={goneViralLogo}
            width={34}
          />
          <span className="wordmark-text">
            Gone<span>Viral</span>.in
          </span>
        </Link>
        <p>
          The public paid leaderboard for India’s internet. Money decides the
          order; no outcome is guaranteed.
        </p>
      </div>
      <nav aria-label="Footer navigation">
        <div className="footer-link-group">
          <strong>Explore</strong>
          {exploreLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="footer-link-group">
          <strong>Your listing</strong>
          {listingLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="footer-link-group">
          <strong>Support &amp; legal</strong>
          {supportLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <p className="footer-meta">© GoneViral.in</p>
    </footer>
  );
}
