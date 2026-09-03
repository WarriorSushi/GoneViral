import Link from "next/link";

import { LegalPageShell } from "@/components/public/legal-page-shell";
import { publicPageMetadata } from "@/config/seo";

export const metadata = publicPageMetadata({
  description:
    "A plain-language disclosure of how money, adjustments, ties, and Today activity determine GoneViral.in placement.",
  path: "/paid-placement",
  title: "Paid placement disclosure",
});

export default function PaidPlacementPage() {
  return (
    <LegalPageShell
      title="Paid placement disclosure"
      description="GoneViral.in is advertising-style paid placement: money decides the order under transparent rules."
    >
      <section>
        <h2>What this product is not</h2>
        <p>
          This is paid advertising placement. It is not a vote, contest,
          lottery, game of chance, prize or winnings programme, investment,
          fundraising product, stored value, or promise of a financial return.
          Customers receive placement under the published rules, not ownership
          or a share of GoneViral or any listing.
        </p>
      </section>
      <section>
        <h2>What payment buys</h2>
        <p>
          An eligible listing is ordered by its effective confirmed sponsorship
          total in Indian rupees. A higher total ranks above a lower total.
          Payment does not buy an endorsement, recommendation, editorial
          approval, minimum rank duration, traffic, clicks, leads, sales,
          publicity, or any other result.
        </p>
      </section>
      <section>
        <h2>How a listing moves</h2>
        <p>
          Provider-confirmed initial and later sponsorship raises the total.
          Other listings may pay more. Effective refunds, chargebacks, and
          reversals reduce the total exactly once. Moderation may restrict or
          remove an otherwise paid listing. Browser return pages and pending
          checkout states do not determine rank.
        </p>
      </section>
      <section>
        <h2>Ties and Today</h2>
        <p>
          Listings with equal effective confirmed totals use the published
          deterministic tie-break fields rather than editorial judgement. The
          Today view shows eligible activity scoped to the current India
          Standard Time day; it is not a separate purchase and does not rewrite
          the all-time confirmed total.
        </p>
      </section>
      <section>
        <h2>Payment provider and adjustments</h2>
        <p>
          Dodo Payments provides hosted checkout and acts as merchant of record
          for the customer transaction. Dodo handles the customer payment,
          transaction-tax calculation and invoice under its terms. GoneViral
          accepts payment and adjustment authority only from authenticated
          provider events recorded in our immutable ledger. Duplicate events are
          idempotent and inconsistent financial events are quarantined for
          review.
        </p>
      </section>
      <section>
        <h2>Related policies</h2>
        <p>
          The <Link href="/terms">Terms</Link>,{" "}
          <Link href="/refunds">Refund policy</Link>, and{" "}
          <Link href="/content-policy">Content policy</Link> govern purchases,
          financial adjustments, and eligibility.
        </p>
      </section>
    </LegalPageShell>
  );
}
