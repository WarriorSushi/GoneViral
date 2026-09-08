import Link from "next/link";

const steps = [
  {
    body: "Add your name, one-line pitch, website, and optional logo. No account is needed before checkout.",
    number: "01",
    title: "Add what you want seen",
  },
  {
    body: "Start from ₹499. The higher your confirmed total, the higher your position on the board.",
    number: "02",
    title: "Choose your position",
  },
  {
    body: "Add more later to move up, then share your public listing page and ready-made rank card.",
    number: "03",
    title: "Move up and show it off",
  },
] as const;

export function HowItWorksContent({
  headingId,
  presentation,
}: {
  readonly headingId: string;
  readonly presentation: "modal" | "page";
}) {
  return (
    <div className="how-content" data-presentation={presentation}>
      <header className="how-heading">
        <h1 id={headingId} tabIndex={presentation === "modal" ? -1 : undefined}>
          Pay more. Rank higher.
        </h1>
        <p>
          ₹499 gets your brand, product, or profile onto the public leaderboard.
          More confirmed spend moves you higher.
        </p>
      </header>

      <p className="how-rule-strip">
        <strong>Simple rule:</strong> higher confirmed total, higher rank. No
        votes. No algorithm.
      </p>

      <ol className="how-step-grid" aria-label="How to get listed">
        {steps.map((step, index) => (
          <li key={step.number}>
            <span className="how-step-number" aria-hidden="true">
              {step.number}
            </span>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
            {index < steps.length - 1 ? (
              <svg
                className="how-step-arrow"
                aria-hidden="true"
                viewBox="0 0 28 16"
              >
                <path d="M1 8h24M19 2l6 6-6 6" />
              </svg>
            ) : null}
          </li>
        ))}
      </ol>

      <section className="how-value" aria-labelledby={`${headingId}-value`}>
        <h2 id={`${headingId}-value`}>Your listing keeps working</h2>
        <ul>
          <li>
            <strong>Stay visible:</strong> Someone can move above you, but they
            do not replace your listing.
          </li>
          <li>
            <strong>Send people out:</strong> Your listing links directly to
            your website.
          </li>
          <li>
            <strong>Share the moment:</strong> Show your current rank with a
            GoneViral card and link.
          </li>
        </ul>
      </section>

      <section
        className="how-good-to-know"
        aria-labelledby={`${headingId}-facts`}
      >
        <h2 id={`${headingId}-facts`}>Good to know</h2>
        <ul>
          <li>Your position appears only after payment is confirmed.</li>
          <li>
            Daily resets at midnight IST. Your confirmed total stays on the
            all-time board.
          </li>
          <li>
            There is no monthly subscription. Add more only when you want to.
          </li>
        </ul>
        <p>
          Ranks can change. Payment does not guarantee views, clicks, leads,
          sales, or publicity. Listings must follow the content rules.
        </p>
      </section>

      <div id="join" className="how-actions">
        <div>
          {/* A hard navigation clears the explainer modal before the join route opens. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="button button-primary" href="/join">
            Claim your place from ₹499 <span aria-hidden="true">→</span>
          </a>
          <Link className="button button-secondary" href="/">
            See leaderboard
          </Link>
        </div>
        <p>
          Already listed? <Link href="/manage">Manage your listing</Link>
        </p>
      </div>
    </div>
  );
}
