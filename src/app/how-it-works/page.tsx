import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <main id="main-content" className="how-main">
      <section className="how-hero">
        <h1>Pay. Get seen.</h1>
        <p>
          Get on the GoneViral.in leaderboard. No sign-up. No API. No nonsense.
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
              <p>You are on the leaderboard. People can find you.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">3</span>
            <div>
              <h2>Want a higher spot?</h2>
              <p>Pay more. Move up. Very advanced maths.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="how-facts" aria-labelledby="facts-title">
        <h2 id="facts-title">Good to know</h2>
        <ul>
          <li>A click on your card goes straight to your website.</li>
          <li>Today starts over at midnight IST.</li>
          <li>Payment gets you a spot. It does not promise clicks or sales.</li>
        </ul>
        <p id="manage">
          Ready to be seen? <Link href="/join">Join the list</Link>. Tools to
          edit a listing will arrive later.
        </p>
      </section>
    </main>
  );
}
