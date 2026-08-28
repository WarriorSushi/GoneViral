import type { Metadata } from "next";

import { LegalPlaceholder } from "@/components/public/legal-placeholder";

export const metadata: Metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <LegalPlaceholder
      description="The product mechanics below are fixed by policy. Transaction, provider, and legal flows are not enabled yet."
      title="How the sponsored board works"
    >
      <section id="sponsoring">
        <h2>1. Sponsor a public listing</h2>
        <p>
          The first confirmed sponsorship starts at ₹499. A listing represents
          one legitimate person, product, company, creator, brand, or
          organisation.
        </p>
      </section>
      <section>
        <h2>2. Confirmed amounts accumulate</h2>
        <p>
          Main ranks the cumulative confirmed sponsorship total, net of applied
          reversals. A browser return never changes the board.
        </p>
      </section>
      <section>
        <h2>3. Higher totals rank first</h2>
        <p>
          If two listings have the same total, the listing that reached it
          earlier stays above. A challenger must exceed the target by ₹1.
        </p>
      </section>
      <section>
        <h2>4. Today resets at midnight IST</h2>
        <p>
          Today shows confirmed sponsorship applied during the current
          Asia/Kolkata calendar day, net of reversals posted that day.
        </p>
      </section>
      <section id="manage">
        <h2>5. Management follows verified email ownership</h2>
        <p>
          Passwordless management and raises are planned for later phases. This
          public shell does not authenticate owners or accept payments.
        </p>
      </section>
      <section>
        <h2>What sponsorship does not guarantee</h2>
        <p>
          A sponsorship does not guarantee a permanent rank, impressions,
          clicks, sales, followers, press, backlinks, or virality. Position is
          sponsored, not editorial endorsement.
        </p>
      </section>
    </LegalPlaceholder>
  );
}
