import Link from "next/link";

import { LegalPageShell } from "@/components/public/legal-page-shell";
import { publicPageMetadata } from "@/config/seo";

export const metadata = publicPageMetadata({
  description:
    "Eligibility, exclusions, timing, and ranking effects for GoneViral.in refunds and payment disputes.",
  path: "/refunds",
  title: "Refund policy",
});

export default function RefundsPage() {
  return (
    <LegalPageShell
      title="Refund policy"
      description="This policy explains when paid placement may be refunded and how verified financial adjustments affect the board."
    >
      <section>
        <h2>1. Before payment</h2>
        <p>
          You may abandon checkout before payment is completed. A pending or
          failed checkout creates no confirmed sponsorship. Because placement
          begins after provider-confirmed payment and the service is delivered
          digitally, there is no general cancellation right merely because a
          position later changes.
        </p>
      </section>
      <section>
        <h2>2. When a refund may be available</h2>
        <p>
          We will review a request for a duplicate or otherwise erroneous
          charge, a payment confirmed where the corresponding placement was
          never provided because of our verified technical failure, an
          adjustment required by Dodo Payments or another payment provider, or a
          remedy required by applicable law. Evidence and identity or authority
          checks may be required.
        </p>
      </section>
      <section>
        <h2>3. What is not normally refundable</h2>
        <p>
          Once provider-confirmed placement has been supplied, the purchase is
          final and non-refundable except for a ground in section 2. A changed
          rank, another listing paying more, lack of traffic, clicks, leads,
          sales, publicity, rank duration, or any other hoped-for result is not
          a refund ground. Removal or restriction for a material breach of the{" "}
          <Link href="/content-policy">Content policy</Link> or{" "}
          <Link href="/terms">Terms</Link> is not normally refundable. This does
          not limit non-waivable statutory rights.
        </p>
      </section>
      <section>
        <h2>4. How to request review</h2>
        <p>
          Contact us promptly through the{" "}
          <Link href="/contact">Contact page</Link> with the payer email,
          listing, approximate date, amount, provider reference if available,
          reason, and supporting evidence. Do not send full card details,
          passwords, or one-time codes. We may ask for identity or authority
          verification.
        </p>
      </section>
      <section>
        <h2>5. Review and timing</h2>
        <p>
          We aim to acknowledge a request within 48 hours and decide ordinary
          cases within 10 business days after receiving sufficient information.
          If approved, submission to the payment provider is normally made
          within five business days. Your bank or provider controls the final
          posting time, which may take additional business days.
        </p>
      </section>
      <section>
        <h2>6. Ranking and ledger effect</h2>
        <p>
          A refund request, internal approval, or browser message never changes
          rank by itself. Only an effective, authenticated provider adjustment
          accepted into the immutable ledger reduces the confirmed sponsorship
          total. Each provider adjustment is applied exactly once. A partial
          refund reduces only the verified amount; an effective full refund may
          remove all sponsorship attributable to that payment.
        </p>
      </section>
      <section>
        <h2>7. Chargebacks and reversals</h2>
        <p>
          A provider-confirmed dispute, chargeback, refund, or reversal may
          reduce placement and may temporarily restrict owner actions while it
          is investigated. If the provider later reverses that adjustment, the
          confirmed total is restored exactly once from the authenticated event.
          Duplicate or contradictory events are quarantined for review.
        </p>
      </section>
      <section>
        <h2>8. Statutory rights</h2>
        <p>
          Nothing in this policy excludes a remedy that cannot lawfully be
          excluded under applicable Indian consumer law. If this policy
          conflicts with a mandatory right, that right prevails.
        </p>
      </section>
    </LegalPageShell>
  );
}
