import type { ReactNode } from "react";

export function LegalPlaceholder({
  children,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <main id="main-content" className="legal-main">
      <h1>{title}</h1>
      <p className="legal-lede">{description}</p>
      <aside className="legal-warning">
        <strong>Draft only.</strong>
        <p>A lawyer must check this page before launch.</p>
      </aside>
      <div className="legal-copy">{children}</div>
    </main>
  );
}
