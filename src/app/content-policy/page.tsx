import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/public/legal-placeholder";
import { draftLegalRobots } from "@/config/seo";

export const metadata: Metadata = {
  robots: draftLegalRobots,
  title: "Content policy — draft",
};
export default function ContentPolicyPage() {
  return (
    <LegalPlaceholder
      title="Content policy"
      description="The enforceable content and grievance policy will appear here after counsel and provider review."
    >
      <section>
        <h2>Baseline restrictions</h2>
        <p>
          Illegal, harmful, deceptive, malicious, adult, extremist, counterfeit,
          phishing, impersonation, and provider-prohibited content is not
          eligible. Reports never change rank solely by count.
        </p>
      </section>
    </LegalPlaceholder>
  );
}
