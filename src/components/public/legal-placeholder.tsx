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
      <aside aria-labelledby="legal-draft-status" className="legal-warning">
        <strong id="legal-draft-status">
          Counsel-pending draft — not effective.
        </strong>
        <p>
          This placeholder has not been approved by legal counsel and is not a
          statement of final legal rights or obligations.
        </p>
        <dl className="legal-version">
          <div>
            <dt>Effective date</dt>
            <dd>Not effective — counsel approval pending</dd>
          </div>
          <div>
            <dt>Draft version</dt>
            <dd>2026-08-29-phase14</dd>
          </div>
        </dl>
      </aside>
      <div className="legal-copy">{children}</div>
    </main>
  );
}
