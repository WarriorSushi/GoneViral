import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/public/legal-placeholder";
import { draftLegalRobots } from "@/config/seo";

export const metadata: Metadata = {
  robots: draftLegalRobots,
  title: "Terms — draft",
};
export default function TermsPage() {
  return (
    <LegalPlaceholder
      title="Terms"
      description="Our final rules will appear here after a lawyer checks them."
    >
      <section>
        <h2>Required review</h2>
        <p>
          The final rules must explain payments, rank changes, refunds, content
          checks, disputes, and what we can and cannot promise.
        </p>
      </section>
    </LegalPlaceholder>
  );
}
