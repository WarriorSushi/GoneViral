import Link from "next/link";

import { LegalPageShell } from "@/components/public/legal-page-shell";
import { publicPageMetadata } from "@/config/seo";

export const metadata = publicPageMetadata({
  description:
    "How GoneViral.in collects, uses, shares, protects, retains, and responds to requests about personal data.",
  path: "/privacy",
  title: "Privacy policy",
});

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy policy"
      description="This policy explains our handling of personal data when you browse, submit, pay for, manage, or report a listing."
    >
      <section>
        <h2>1. Who is responsible</h2>
        <p>
          The operator identified above controls the processing described here.
          Privacy and grievance requests may be sent through our{" "}
          <Link href="/contact">Contact page</Link>.
        </p>
      </section>
      <section>
        <h2>2. Data we handle</h2>
        <ul>
          <li>
            Public listing data: name, tagline, category, destination, approved
            logo, confirmed sponsorship total, and public activity.
          </li>
          <li>
            Private submission and owner data: name, email address, phone
            number, access identifiers, policy acceptances, and encrypted
            contact fields.
          </li>
          <li>
            Payment and reconciliation data: provider identifiers, amount,
            currency, status, event timestamps, and adjustment records. We do
            not store full payment-card details.
          </li>
          <li>
            Safety and support data: reports, evidence, moderation decisions,
            appeals, correspondence, and audit records.
          </li>
          <li>
            Technical data: security logs, coarse request metadata, consent
            state, performance errors, and outbound-click events.
          </li>
        </ul>
      </section>
      <section>
        <h2>3. Why we use it</h2>
        <p>
          We use data to provide and secure the service, verify payments,
          calculate and publish the board, deliver owner links and operational
          messages, process refunds and disputes, prevent abuse, moderate
          content, answer requests, maintain financial and security records,
          diagnose failures, and comply with applicable law. Where consent is
          required, it may be withdrawn for future processing; withdrawal does
          not invalidate prior lawful processing or records we must retain.
        </p>
      </section>
      <section>
        <h2>4. Public information and click measurement</h2>
        <p>
          Approved listings and their confirmed totals are public. Contact,
          payment, raw report, and owner-access data are not part of the public
          projection.
        </p>
        <p>
          Outbound visits use a safe redirect. To limit repeated counting, the
          server derives a keyed, one-way identifier scoped to one listing and
          one India Standard Time day. The raw network address is not stored in
          the click record. This count is an anti-abuse estimate, not a unique
          person count and not a ranking input.
        </p>
      </section>
      <section>
        <h2>5. Service providers and disclosures</h2>
        <p>
          We use Supabase for database, authentication, and storage; Vercel for
          hosting and delivery; Dodo Payments for checkout and payment events;
          Resend for transactional email; Sentry for controlled error
          monitoring; and Cloudflare Turnstile for abuse prevention. They
          process data under their terms and security controls. Data may also be
          disclosed when legally required, to protect rights or safety, to
          professional advisers under confidentiality, or as part of a lawful
          business transfer. We do not sell personal data.
        </p>
      </section>
      <section>
        <h2>6. International processing</h2>
        <p>
          Providers may process or store data outside your state or India. We
          select established providers and use contractual, access-control, and
          security measures appropriate to the data and applicable requirements.
        </p>
      </section>
      <section>
        <h2>7. Retention</h2>
        <ul>
          <li>
            Public listing records remain while a listing is active and may be
            retained in limited archives for service integrity.
          </li>
          <li>
            Payment, refund, dispute, consent, and accounting evidence is kept
            for up to eight years after the relevant transaction, or longer if
            required by law or an unresolved dispute.
          </li>
          <li>
            Reports, moderation evidence, and security audit records are
            normally kept for up to three years after closure, subject to legal
            holds and safety needs.
          </li>
          <li>
            Routine application and error logs are normally kept for 30 to 90
            days; verified backups follow the documented rolling retention
            schedule.
          </li>
          <li>
            Abandoned staging uploads and incomplete application data are
            removed on a shorter operational schedule where no legal or fraud
            need requires retention.
          </li>
        </ul>
      </section>
      <section>
        <h2>8. Your choices and requests</h2>
        <p>
          Subject to applicable exceptions, you may ask for a summary of your
          data, correction, completion, erasure, withdrawal of consent, or
          grievance review. We may verify identity and authority before acting.
          Some public or private records cannot be erased immediately where
          financial, fraud-prevention, legal, dispute, or security retention is
          necessary. We will explain an applicable restriction.
        </p>
      </section>
      <section>
        <h2>9. Security and children</h2>
        <p>
          We use encryption, least-privilege access, private schemas, signed
          owner links, provider signature verification, restricted storage,
          backups, and monitoring. No internet service is risk-free; please
          report suspected compromise promptly.
        </p>
        <p>
          The paid submission service is not directed to children. A person
          under 18 must not purchase placement or submit personal data without a
          parent or lawful guardian acting with the authority required by
          applicable law.
        </p>
      </section>
      <section>
        <h2>10. Changes and grievances</h2>
        <p>
          Material changes receive a new version and effective date. Contact
          Syed Irfan Ullah Quadri using the details on the{" "}
          <Link href="/contact">Contact page</Link> for privacy questions or
          grievances. We aim to acknowledge messages within 48 hours and resolve
          ordinary grievances within 30 days, subject to complexity and legal
          requirements.
        </p>
      </section>
    </LegalPageShell>
  );
}
