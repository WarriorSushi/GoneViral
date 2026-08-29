import type { ReactNode } from "react";

import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_OPERATOR,
  LEGAL_POLICY_VERSION,
} from "@/config/legal";

export function LegalPageShell({
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
      <aside aria-label="Policy status" className="legal-policy-status">
        <strong>Effective owner-approved policy</strong>
        <dl className="legal-version">
          <div>
            <dt>Effective date</dt>
            <dd>{LEGAL_EFFECTIVE_DATE}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{LEGAL_POLICY_VERSION}</dd>
          </div>
          <div>
            <dt>Operator</dt>
            <dd>{LEGAL_OPERATOR}</dd>
          </div>
        </dl>
      </aside>
      <div className="legal-copy">{children}</div>
    </main>
  );
}
