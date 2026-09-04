import type { Metadata } from "next";

import { HowItWorksContent } from "@/components/public/how-it-works-content";
import { publicPageMetadata } from "@/config/seo";

export const metadata: Metadata = publicPageMetadata({
  description:
    "Share your listing, pay ₹499 or more, and move higher as your confirmed spend grows.",
  path: "/how-it-works",
  title: "How it works",
});

export default function HowItWorksPage() {
  return (
    <main id="main-content" className="how-main">
      <HowItWorksContent
        headingId="how-it-works-page-title"
        presentation="page"
      />
    </main>
  );
}
