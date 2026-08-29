import Link from "next/link";

const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/content-policy", label: "Content policy" },
  { href: "/paid-placement", label: "Paid placement" },
  { href: "/copyright", label: "Copyright / trademark" },
  { href: "/contact", label: "Contact / report abuse" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="wordmark footer-wordmark" href="/">
          Gone<span>Viral</span>.in
        </Link>
        <p>Paid list. Money decides the order. No outcome is guaranteed.</p>
      </div>
      <nav aria-label="Legal and trust links">
        <Link href="/how-it-works">How it works</Link>
        {legalLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="footer-meta">© GoneViral.in</p>
    </footer>
  );
}
