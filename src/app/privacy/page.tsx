import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/public/legal-placeholder";

export const metadata: Metadata = { title: "Privacy" };
export default function PrivacyPage() {
  return (
    <LegalPlaceholder
      title="Privacy"
      description="Our final privacy note will appear here after a lawyer checks it."
    >
      <section>
        <h2>Required review</h2>
        <p>
          The final note must explain what we collect, why we need it, how we
          protect it, how long we keep it, and how you can ask for help.
        </p>
      </section>
    </LegalPlaceholder>
  );
}
