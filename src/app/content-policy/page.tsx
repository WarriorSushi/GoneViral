import Link from "next/link";

import { LegalPageShell } from "@/components/public/legal-page-shell";
import { publicPageMetadata } from "@/config/seo";

export const metadata = publicPageMetadata({
  description:
    "The content, destination, logo, moderation, reporting, and appeal rules for GoneViral.in listings.",
  path: "/content-policy",
  title: "Content policy",
});

export default function ContentPolicyPage() {
  return (
    <LegalPageShell
      title="Content policy"
      description="Paid placement is available only to listings, logos, and destinations that satisfy these safety and rights rules."
    >
      <section>
        <h2>1. Your responsibility</h2>
        <p>
          You are responsible for the listing, logo, destination, and claims you
          submit. You must have the necessary rights, permissions, and authority
          and must keep the destination consistent with the approved listing.
        </p>
      </section>
      <section>
        <h2>2. Prohibited content and conduct</h2>
        <p>Do not submit or link to content that:</p>
        <ul>
          <li>
            is illegal; exploits or endangers children; promotes terrorism,
            violent extremism, human trafficking, or credible violence;
          </li>
          <li>
            contains non-consensual sexual material, sexual services, explicit
            adult content, or intimate imagery shared without consent;
          </li>
          <li>
            facilitates malware, phishing, credential theft, spam, fraud,
            impersonation, deceptive investment schemes, or evasion of technical
            controls;
          </li>
          <li>
            unlawfully discriminates, threatens, harasses, doxxes, or incites
            hatred or violence against a person or protected group;
          </li>
          <li>
            infringes copyright, trademark, privacy, publicity, or other rights,
            or markets counterfeit or unlawfully regulated goods;
          </li>
          <li>
            makes materially false or misleading claims, hides the true
            destination, or violates the rules of our payment, hosting, email,
            security, or storage providers.
          </li>
        </ul>
      </section>
      <section>
        <h2>3. Logos, destinations, and changes</h2>
        <p>
          Logos must be safe image files and may be resized, converted, or
          stripped of metadata. Destinations must use HTTPS, resolve to the
          represented subject, and remain safe. Redirect chains, domain changes,
          or destination content that materially changes after approval may
          trigger re-review, restriction, or removal.
        </p>
      </section>
      <section>
        <h2>4. Screening and moderation</h2>
        <p>
          We may use automated checks and human review before or after
          publication. We may reject, hold, label, restrict, suspend, or remove
          a listing; disable its redirect; preserve evidence; and restrict owner
          access when reasonably necessary for safety, law, provider rules, an
          investigation, or service integrity. Payment never prevents moderation
          and report volume alone never determines the outcome.
        </p>
      </section>
      <section>
        <h2>5. Reports</h2>
        <p>
          Use the listing report link for abuse, fraud, safety, impersonation,
          misleading claims, or rights concerns. Include a specific URL,
          explanation, and evidence. For copyright or trademark matters, follow
          the detailed <Link href="/copyright">rights notice procedure</Link>.
          Do not include passwords, payment-card numbers, or unrelated personal
          data.
        </p>
      </section>
      <section>
        <h2>6. Decisions and appeals</h2>
        <p>
          Owners may appeal a moderation decision through the{" "}
          <Link href="/contact">Contact page</Link>. Identify the listing and
          decision, explain the error, and provide new evidence. A different
          reviewer will be used where practicable. We aim to acknowledge an
          appeal within 48 hours and resolve ordinary appeals within 30 days,
          although urgent safety action may remain in force during review.
        </p>
      </section>
      <section>
        <h2>7. Evidence, law, and refunds</h2>
        <p>
          We may retain limited evidence and audit history after removal for
          fraud prevention, disputes, legal compliance, and repeat-abuse
          detection. We may refer credible imminent threats or legally required
          matters to appropriate authorities. Financial treatment after
          moderation follows the <Link href="/refunds">Refund policy</Link> and
          non-waivable law.
        </p>
      </section>
    </LegalPageShell>
  );
}
