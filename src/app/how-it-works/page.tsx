import type { Metadata } from "next";

import { HowItWorksContent } from "@/components/public/how-it-works-content";
import { publicPageMetadata } from "@/config/seo";

export const metadata: Metadata = publicPageMetadata({
  description:
    "Get onto the public leaderboard from ₹499, move higher with your confirmed total, and share your rank card.",
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
