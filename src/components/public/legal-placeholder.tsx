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
      <p className="eyebrow">PRE-LAUNCH DRAFT · COUNSEL REVIEW REQUIRED</p>
      <h1>{title}</h1>
      <p className="legal-lede">{description}</p>
      <aside className="legal-warning">
        <strong>
          This is a structural placeholder, not approved legal text.
        </strong>
        <p>
          It must be reviewed by Indian counsel before checkout or public
          launch.
        </p>
      </aside>
      <div className="legal-copy">{children}</div>
    </main>
  );
}
