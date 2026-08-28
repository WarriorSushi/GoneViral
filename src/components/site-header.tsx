import Link from "next/link";

const menuLinks = [
  { href: "/", label: "Main board" },
  { href: "/today", label: "Today" },
  { href: "/how-it-works", label: "How it works" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="wordmark" href="/" aria-label="GoneViral.in home">
          Gone<span>Viral</span>.in
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/how-it-works">How it works</Link>
        </nav>
        <div className="header-actions">
          <Link className="button button-primary" href="/how-it-works#join">
            Join the list
          </Link>
        </div>
        <details className="mobile-menu">
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            {menuLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            <Link href="/how-it-works#manage">Manage my listing</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
