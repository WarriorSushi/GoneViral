import Link from "next/link";

const steps = [
  {
    body: "Product, SaaS, service, or business. Add the name, link, and category.",
    number: "01",
    title: "Share your listing",
  },
  {
    body: "Your confirmed spend gets you on the leaderboard.",
    number: "02",
    title: "Pay ₹499+",
  },
  {
    body: "Add more later to climb. Higher confirmed spend = higher rank.",
    number: "03",
    title: "Move higher",
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
        <p className="eyebrow">How GoneViral works</p>
        <h1 id={headingId} tabIndex={presentation === "modal" ? -1 : undefined}>
          Pay. Get seen.
        </h1>
        <p>Three simple steps to get on the board.</p>
      </header>

      <ol className="how-step-grid" aria-label="Three simple steps">
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

      <p className="how-rule-strip">
        <strong>₹499 gets you on the board.</strong> More spend = higher rank.
      </p>

      <section
        className="how-good-to-know"
        aria-labelledby={`${headingId}-facts`}
      >
        <h2 id={`${headingId}-facts`}>Good to know</h2>
        <ul>
          <li>Clicks go straight to your website</li>
          <li>
            All-time ranking never resets; daily ranking resets at midnight IST
          </li>
          <li>Your rank can change as others join or pay more</li>
        </ul>
        <p>
          Payment does not guarantee traffic, clicks, sales, or any other
          result.
        </p>
      </section>

      <div id="join" className="how-actions">
        <div>
          <Link className="button button-primary" href="/join">
            Join for ₹499 <span aria-hidden="true">→</span>
          </Link>
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
