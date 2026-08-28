import Link from "next/link";

const primaryLinks = [
  { href: "/", label: "Main" },
  { href: "/today", label: "Today" },
  { href: "/how-it-works", label: "How it works" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="wordmark" href="/" aria-label="GoneViral.in home">
          GONEVIRAL<span>.IN</span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link href="/category/people-creators">Categories</Link>
        </nav>
        <div className="header-actions">
          <Link className="manage-link" href="/how-it-works#manage">
            Manage
          </Link>
          <Link
            className="button button-primary"
            href="/how-it-works#sponsoring"
          >
            Sponsor your spot
          </Link>
        </div>
        <details className="mobile-menu">
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            <Link href="/category/people-creators">Categories</Link>
            <Link href="/how-it-works#manage">Manage my listing</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
