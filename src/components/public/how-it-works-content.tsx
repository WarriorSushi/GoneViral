import Link from "next/link";

const steps = [
  {
    body: "Add your brand, product, profile, or service with a direct website link.",
    number: "01",
    title: "Share your listing",
  },
  {
    body: "Choose an amount from ₹499. Placement begins after payment is confirmed.",
    number: "02",
    title: "Pay ₹499+",
  },
  {
    body: "Add more later. Your payment counts toward both your lifetime total and today’s total.",
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
          Pay. Get listed.
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

      <section
        className="how-good-to-know"
        aria-labelledby={`${headingId}-facts`}
      >
        <h2 id={`${headingId}-facts`}>Good to know</h2>
        <ul>
          <li>
            <strong>All time:</strong> Your cumulative confirmed spend
            determines your long-term rank.
          </li>
          <li>
            <strong>Daily:</strong> Money applied today determines today&apos;s
            rank. Daily starts fresh at midnight IST, while your payment still
            remains part of your lifetime total.
          </li>
          <li>Ranks can change and no position is reserved.</li>
        </ul>
        <p>
          Payment does not guarantee traffic, clicks, leads, sales, publicity,
          or business results.
        </p>
      </section>

      <div id="join" className="how-actions">
        <div>
          <Link className="button button-primary" href="/join">
            Get listed starting from ₹499 <span aria-hidden="true">→</span>
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
