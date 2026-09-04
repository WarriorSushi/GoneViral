import Link from "next/link";

const productLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/paid-placement", label: "Paid placement" },
] as const;

const trustLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/content-policy", label: "Content policy" },
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
        <p>
          The public paid leaderboard for India’s internet. Money decides the
          order; no outcome is guaranteed.
        </p>
      </div>
      <nav aria-label="Legal and trust links">
        <div className="footer-link-group">
          <strong>Product</strong>
          {productLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="footer-link-group">
          <strong>Trust &amp; legal</strong>
          {trustLinks.map((link) => (
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
