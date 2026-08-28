import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/public/legal-placeholder";

export const metadata: Metadata = { title: "Terms placeholder" };
export default function TermsPage() {
  return (
    <LegalPlaceholder
      title="Terms"
      description="Terms governing variable sponsored placement will appear here after counsel review."
    >
      <section>
        <h2>Required review</h2>
        <p>
          The final terms must cover cumulative sponsorship, variable rank, no
          traffic guarantee, moderation, reversals, provider checkout, dispute
          handling, and policy version acceptance.
        </p>
      </section>
    </LegalPlaceholder>
  );
}
