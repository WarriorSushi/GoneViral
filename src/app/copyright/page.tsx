import Link from "next/link";

import { LegalPageShell } from "@/components/public/legal-page-shell";
import { LEGAL_EMAIL } from "@/config/legal";
import { publicPageMetadata } from "@/config/seo";

export const metadata = publicPageMetadata({
  description:
    "How to submit copyright and trademark notices, responses, and supporting evidence to GoneViral.in.",
  path: "/copyright",
  title: "Copyright and trademark",
});

export default function CopyrightPage() {
  return (
    <LegalPageShell
      title="Copyright and trademark"
      description="We respect intellectual-property rights and review specific, evidence-backed notices and responses."
    >
      <section>
        <h2>Copyright notices</h2>
        <p>
          Email <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> with: your
          legal name and contact details; identification of the protected work;
          the exact GoneViral.in listing and destination complained of; the
          location of the allegedly infringing material; an explanation of your
          rights and requested action; a good-faith statement that the use is
          not authorised; a statement that the information is accurate; and your
          physical or electronic signature. If you act for the owner, include
          evidence of authority.
        </p>
      </section>
      <section>
        <h2>Trademark and impersonation notices</h2>
        <p>
          Identify the registered or otherwise protected mark, relevant
          jurisdiction and registration where applicable, the complained-of
          listing or destination, the likely confusion or impersonation, your
          relationship to the rights owner, and the requested action. Include
          screenshots or other evidence that can be preserved.
        </p>
      </section>
      <section>
        <h2>Review and interim action</h2>
        <p>
          We aim to acknowledge a sufficiently complete notice within 48 hours.
          We may request clarification, preserve evidence, disable a redirect,
          restrict a logo or listing, notify the submitter, or take other
          proportionate interim action. Ordinary reviews are targeted for
          completion within 30 days, subject to complexity and legal process.
        </p>
      </section>
      <section>
        <h2>Responses and counter-notices</h2>
        <p>
          An affected submitter may respond with identity and contact details,
          the removed or restricted material, the basis for ownership,
          permission, licence, exception, fair dealing, non-infringement, or
          mistaken identification, supporting evidence, a good-faith accuracy
          statement, and a signature. We may share the response with the
          complainant where appropriate and lawful.
        </p>
      </section>
      <section>
        <h2>Outcomes and repeat abuse</h2>
        <p>
          Depending on the evidence and applicable law, we may restore, keep
          restricted, modify, or remove material and may act against repeat
          infringers or repeat false complainants. Knowingly false notices or
          responses may create legal liability. Do not misuse this process to
          suppress criticism, competition, parody, or lawful use.
        </p>
      </section>
      <section>
        <h2>Other reports</h2>
        <p>
          Privacy, safety, fraud, and general content concerns should use the
          listing report flow or our <Link href="/contact">Contact page</Link>.
          This procedure does not replace any remedy or notice required by
          applicable law.
        </p>
      </section>
    </LegalPageShell>
  );
}
