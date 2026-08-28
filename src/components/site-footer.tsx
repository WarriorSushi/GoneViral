import Link from "next/link";

const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/content-policy", label: "Content policy" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="wordmark footer-wordmark" href="/">
          GONEVIRAL<span>.IN</span>
        </Link>
        <p>
          Sponsored rankings. Positions are determined only by confirmed
          sponsorship amounts.
        </p>
      </div>
      <nav aria-label="Legal and trust links">
        <Link href="/how-it-works">How it works</Link>
        {legalLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="footer-meta">© GoneViral.in · No votes. No algorithm.</p>
    </footer>
  );
}
