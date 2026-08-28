import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <main id="main-content" className="how-main">
      <section className="how-hero">
        <h1>How it works</h1>
        <p>Add your work. Pay to move it up.</p>
        <Link className="text-link" href="/">
          View the list
        </Link>
      </section>

      <section id="join" className="how-steps" aria-label="Three steps">
        <ol>
          <li>
            <span aria-hidden="true">1</span>
            <div>
              <h2>Add your work</h2>
              <p>Share its name and link. Clicks go straight to your site.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">2</span>
            <div>
              <h2>Add money</h2>
              <p>Start at ₹499. Each payment adds to your total.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">3</span>
            <div>
              <h2>Move up</h2>
              <p>More money gets a higher spot.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="how-facts" aria-labelledby="facts-title">
        <h2 id="facts-title">Good to know</h2>
        <ul>
          <li>Today starts over at midnight IST.</li>
          <li>Paying does not promise clicks or sales.</li>
          <li>The list changes only after we confirm a payment.</li>
        </ul>
        <p id="manage">
          Payments and tools to edit a listing are not open yet.
        </p>
      </section>
    </main>
  );
}
