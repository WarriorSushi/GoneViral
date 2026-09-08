import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL_EMAIL, LEGAL_PHONE_HREF, LEGAL_OPERATOR } from "@/config/legal";
import {
  canonicalUrl,
  publicPageMetadata,
  serializeJsonLd,
} from "@/config/seo";

export const metadata: Metadata = publicPageMetadata({
  description:
    "Learn what GoneViral.in is, how India’s sponsored leaderboard works, what can be listed, and who operates the platform.",
  path: "/about",
  title: "About India’s sponsored leaderboard",
});

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  alternateName: "GoneViral.in",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: LEGAL_EMAIL,
    telephone: LEGAL_PHONE_HREF,
  },
  description:
    "AltCorp operates GoneViral.in, India’s transparent sponsored leaderboard for brands, products, profiles, and services.",
  email: LEGAL_EMAIL,
  logo: canonicalUrl("/icon.png"),
  name: "AltCorp",
  url: canonicalUrl("/"),
} as const;

export default function AboutPage() {
  return (
    <main id="main-content" className="legal-main">
      <script
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(organizationJsonLd),
        }}
        type="application/ld+json"
      />
      <h1>About GoneViral.in</h1>
      <p className="legal-lede">
        GoneViral.in is India&apos;s sponsored leaderboard: a public place for
        brands, products, profiles, and services to compete for visibility.
      </p>
      <div className="legal-copy">
        <section>
          <h2>What GoneViral.in does</h2>
          <p>
            Eligible listings are ordered by confirmed sponsored spend. The
            all-time board reflects cumulative confirmed spend, while the Daily
            board reflects money applied during the current India Standard Time
            day.
          </p>
          <p>
            The rule is intentionally direct and public: money decides the
            order. A position does not imply endorsement, verification, or a
            promise of clicks, sales, publicity, or any other result.
          </p>
        </section>
        <section>
          <h2>Who it is for</h2>
          <p>
            Makers, founders, creators, businesses, and independent
            professionals can list an eligible brand, product, profile, or
            service with a direct HTTPS destination. Every submission must meet
            the <Link href="/content-policy">content policy</Link>.
          </p>
        </section>
        <section>
          <h2>How sponsored ranking works</h2>
          <p>
            A listing starts from ₹499 after payment confirmation and can move
            higher when more confirmed money is added. Ranks can change at any
            time. Read the plain-language{" "}
            <Link href="/how-it-works">how it works</Link> guide and the
            detailed{" "}
            <Link href="/paid-placement">paid placement disclosure</Link>.
          </p>
        </section>
        <section>
          <h2>Operator and contact</h2>
          <p>{LEGAL_OPERATOR}</p>
          <p>
            For support, privacy, payment, rights, or grievance questions, visit
            the <Link href="/contact">contact and grievances page</Link> or
            email <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
