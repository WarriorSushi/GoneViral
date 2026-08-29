import Link from "next/link";

import { LegalPageShell } from "@/components/public/legal-page-shell";
import { publicPageMetadata } from "@/config/seo";

export const metadata = publicPageMetadata({
  description:
    "The terms governing paid placement, accounts, content, payments, and use of GoneViral.in.",
  path: "/terms",
  title: "Terms of service",
});

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of service"
      description="These terms govern your use of GoneViral.in and your purchase of paid leaderboard placement."
    >
      <section>
        <h2>1. The service</h2>
        <p>
          GoneViral.in is a paid, public leaderboard. Eligible listings are
          ordered by their effective confirmed sponsorship total, subject to the
          published tie-break rules and moderation. Paying buys placement under
          those rules; it does not buy an endorsement, audience, click, lead,
          sale, investment, or other outcome.
        </p>
        <p>
          The current ordering explanation is in our{" "}
          <Link href="/paid-placement">Paid placement disclosure</Link>.
        </p>
      </section>
      <section>
        <h2>2. Eligibility and authority</h2>
        <p>
          You must be legally capable of entering a contract and authorised to
          submit the listing, destination, contact details, and payment method.
          You must provide accurate information and keep owner-access methods
          secure. You may not act for another person or organisation without
          authority.
        </p>
      </section>
      <section>
        <h2>3. Payments and placement</h2>
        <p>
          Amounts are displayed and charged in Indian rupees. The server, not
          browser state, calculates the permitted amount. A listing becomes paid
          only after an authenticated provider event is accepted into our
          immutable payment ledger. Pending, failed, reversed, refunded, or
          disputed amounts do not create or retain confirmed placement.
        </p>
        <p>
          Later sponsorship may move a listing up. Later sponsorship for other
          listings, refunds, chargebacks, adjustments, moderation, and the
          published tie-break rules may move it down. We do not promise a
          position or a duration at a position.
        </p>
      </section>
      <section>
        <h2>4. Your content and licence</h2>
        <p>
          You retain your rights in content you submit. You grant us a
          worldwide, non-exclusive, royalty-free licence to host, reproduce,
          resize, format, display, and distribute it only as reasonably needed
          to operate, secure, promote, and archive the service. You confirm that
          you have the rights required to grant that licence.
        </p>
        <p>
          Listings and destinations must comply with our{" "}
          <Link href="/content-policy">Content policy</Link>. We may screen,
          investigate, restrict, suspend, or remove content and preserve
          evidence when reasonably necessary for safety, law, provider rules,
          disputes, or service integrity. Payment does not prevent moderation.
        </p>
      </section>
      <section>
        <h2>5. Acceptable use</h2>
        <p>
          You must not attack, scrape abusively, bypass controls, manipulate
          ranks or clicks, submit deceptive reports, introduce malicious code,
          probe private data, interfere with other users, or use the service
          unlawfully. Automated access is permitted only where we expressly
          allow it.
        </p>
      </section>
      <section>
        <h2>6. Refunds and disputes</h2>
        <p>
          Refund eligibility, exclusions, timing, and the effect of chargebacks
          are governed by our <Link href="/refunds">Refund policy</Link>. A
          request alone does not change rank. An effective provider adjustment
          changes the confirmed total exactly once after verification.
        </p>
      </section>
      <section>
        <h2>7. Availability and changes</h2>
        <p>
          We may maintain, change, suspend, or discontinue features to protect
          users, comply with law or provider requirements, or operate the
          service. We will use reasonable care, but do not guarantee continuous
          availability or error-free operation. Material policy changes will be
          published with a new effective date and version; new checkout
          acceptances use the then-current version.
        </p>
      </section>
      <section>
        <h2>8. Intellectual property</h2>
        <p>
          The service software, design, branding, and original materials belong
          to us or our licensors. These terms do not transfer those rights. See
          our <Link href="/copyright">Copyright and trademark notice</Link> for
          reporting procedures.
        </p>
      </section>
      <section>
        <h2>9. Disclaimers and liability</h2>
        <p>
          To the maximum extent permitted by applicable law, the service is
          provided on an “as available” basis and we exclude implied warranties
          that may lawfully be excluded. We are not liable for indirect,
          incidental, special, punitive, or consequential loss, lost profit, or
          lost opportunity. Our aggregate liability connected with a paid
          placement will not exceed the amount you paid for that placement in
          the twelve months before the event giving rise to the claim.
        </p>
        <p>
          Nothing in these terms excludes fraud, wilful misconduct, liability
          that cannot legally be limited, or non-waivable consumer rights.
        </p>
      </section>
      <section>
        <h2>10. Responsibility for claims</h2>
        <p>
          To the extent permitted by law, you will compensate us for reasonable
          losses and costs arising from your unlawful content, infringement,
          unauthorised submission, or material breach of these terms. We will
          give reasonable notice and allow reasonable participation in the
          defence of such a claim.
        </p>
      </section>
      <section>
        <h2>11. Governing law and contact</h2>
        <p>
          These terms are governed by Indian law. Subject to non-waivable
          consumer-forum rights and other mandatory jurisdiction, courts at
          Kalaburagi, Karnataka have jurisdiction. Before formal proceedings,
          please use the process on our{" "}
          <Link href="/contact">Contact page</Link>
          so we can try to resolve the issue promptly.
        </p>
      </section>
    </LegalPageShell>
  );
}
