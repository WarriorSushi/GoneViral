import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/public/legal-placeholder";
import { draftLegalRobots } from "@/config/seo";

export const metadata: Metadata = {
  robots: draftLegalRobots,
  title: "Contact — draft",
};
export default function ContactPage() {
  return (
    <LegalPlaceholder
      title="Contact and grievance"
      description="Verified support and grievance contact details will appear here before launch."
    >
      <section>
        <h2>Not active yet</h2>
        <p>
          No support inbox, grievance officer, or public report workflow is
          represented as configured in this phase.
        </p>
      </section>
    </LegalPlaceholder>
  );
}
