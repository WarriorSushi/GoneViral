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
        <h2>Outbound click measurement</h2>
        <p>
          Website visits use a safe redirect. To avoid counting the same person
          repeatedly, the server creates a keyed, one-way identifier scoped to
          one listing and one IST day. It does not store the raw network
          address, email address, or a browsing profile. These deduplication
          identifiers expire after about eight days; longer-lived public totals
          are aggregate counts and never affect leaderboard rank.
        </p>
      </section>
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
