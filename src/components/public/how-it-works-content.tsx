const steps = [
  {
    body: "Add your details and pay ₹499 or more.",
    title: "How do I join?",
  },
  {
    body: "Higher confirmed total = higher rank.",
    title: "How is rank decided?",
  },
  {
    body: "A public listing, website link, and rank card to share.",
    title: "What do I get?",
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
          How GoneViral works
        </h1>
        <p>
          Pay ₹499 or more to join the leaderboard. Pay more to rank higher.
        </p>
      </header>

      <ol className="how-step-grid" aria-label="How to get listed">
        {steps.map((step, index) => (
          <li key={step.title}>
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

      <p className="how-note">
        Daily rank resets at midnight IST; your all-time total stays. Ranks can
        change, listings must follow the content rules, and payment does not
        guarantee clicks.
      </p>

      <div id="join" className="how-actions">
        {/* A hard navigation clears the explainer modal before the join route opens. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="button button-primary" href="/join">
          Claim your place from ₹499 <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
