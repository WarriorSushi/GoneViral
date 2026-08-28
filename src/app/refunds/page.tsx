import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/public/legal-placeholder";

export const metadata: Metadata = { title: "Refunds placeholder" };
export default function RefundsPage() {
  return (
    <LegalPlaceholder
      title="Refunds"
      description="Provider-effective refund and chargeback rules will appear here after legal and accounting review."
    >
      <section>
        <h2>Product invariant</h2>
        <p>
          A refund request alone never changes rank. Only an effective,
          authenticated provider adjustment applied to the immutable ledger can
          reduce a confirmed total.
        </p>
      </section>
    </LegalPlaceholder>
  );
}
