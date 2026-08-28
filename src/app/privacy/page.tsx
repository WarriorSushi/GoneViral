import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/public/legal-placeholder";

export const metadata: Metadata = { title: "Privacy placeholder" };
export default function PrivacyPage() {
  return (
    <LegalPlaceholder
      title="Privacy"
      description="A DPDP-aligned privacy notice will appear here after counsel review."
    >
      <section>
        <h2>Required review</h2>
        <p>
          The final notice must explain public listing data, confidential owner
          and payment data, purpose, retention, rights, security, processors,
          grievance contact, and lawful financial record preservation.
        </p>
      </section>
    </LegalPlaceholder>
  );
}
