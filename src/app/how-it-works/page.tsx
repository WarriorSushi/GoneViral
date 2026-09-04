import type { Metadata } from "next";
import Link from "next/link";

import { publicPageMetadata } from "@/config/seo";

export const metadata: Metadata = publicPageMetadata({
  description:
    "Add your work, pay at least ₹499, and join a paid list ordered by cumulative provider-confirmed totals.",
  path: "/how-it-works",
  title: "How it works",
});

export default function HowItWorksPage() {
  return (
    <main id="main-content" className="how-main">
      <section className="how-hero">
        <h1>Pay more. Rank higher.</h1>
        <p>
          No votes. No algorithm. No account before checkout. Confirmed totals
          determine the order.
        </p>
        <Link className="text-link" href="/">
          See the leaderboard
        </Link>
      </section>

      <section id="join" className="how-steps" aria-label="Three steps">
        <ol>
          <li>
            <span aria-hidden="true">1</span>
            <div>
              <h2>Share your link</h2>
              <p>Name, link, category. That is it.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">2</span>
            <div>
              <h2>Pay ₹499 or more</h2>
              <p>
                Provider-confirmed payment supplies placement if the listing
                remains eligible under our content rules.
              </p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">3</span>
            <div>
              <h2>Want a higher spot?</h2>
              <p>
                A larger confirmed cumulative total can move you up. Other
                listings can move too.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="how-facts" aria-labelledby="facts-title">
        <h2 id="facts-title">Good to know</h2>
        <ul>
          <li>A click on your card goes straight to your website.</li>
          <li>Today starts over at midnight IST.</li>
          <li>
            Rank and duration can change. Payment does not promise traffic,
            clicks, sales, or any other result.
          </li>
        </ul>
        <p id="manage">
          Ready to join? <Link href="/join">Add your work</Link>. Existing
          owners can use their secure manage link to update an eligible listing
          or add another payment.
        </p>
      </section>
    </main>
  );
}
