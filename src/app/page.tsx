const swatches = [
  { name: "Canvas", value: "#f4f1ea", className: "swatch-canvas" },
  { name: "Surface", value: "#fffcf7", className: "swatch-surface" },
  { name: "Ink", value: "#14120f", className: "swatch-ink" },
  { name: "Signal", value: "#ff5a36", className: "swatch-signal" },
] as const;

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <main
        id="main-content"
        className="site-shell mx-auto min-h-screen w-full max-w-[1440px]"
      >
        <header className="masthead">
          <a className="wordmark" href="#top" aria-label="GoneViral.in home">
            GONEVIRAL<span>.IN</span>
          </a>
          <p className="phase-label">PHASE 0 · FOUNDATION</p>
        </header>

        <section id="top" className="intro" aria-labelledby="foundation-title">
          <div>
            <p className="eyebrow">THE SPONSORED INTERNET LEADERBOARD</p>
            <h1 id="foundation-title">Editorial signal, engineered first.</h1>
          </div>
          <div className="intro-copy">
            <p>
              This page verifies GoneViral&apos;s visual tokens, typography,
              focus states and responsive baseline. It contains no listings,
              payments or public activity.
            </p>
            <a className="primary-action" href="#tokens">
              Inspect the token system
            </a>
          </div>
        </section>

        <aside
          className="disclosure"
          aria-label="Required sponsored ranking disclosure"
        >
          <span>REQUIRED DISCLOSURE</span>
          <strong>
            Sponsored rankings. Positions are determined only by confirmed
            sponsorship amounts.
          </strong>
        </aside>

        <section className="signal-board" aria-labelledby="signal-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">VISUAL GUARDRAIL</p>
              <h2 id="signal-title">The board will be the product.</h2>
            </div>
            <span className="status status-neutral">NOT LIVE DATA</span>
          </div>

          <div className="signal-row signal-row-header" aria-hidden="true">
            <span>RULE</span>
            <span>SIGNAL</span>
            <span>STATE</span>
          </div>
          <div className="signal-row">
            <span className="rank">#01</span>
            <div>
              <strong>Money remains exact</strong>
              <p>
                Integer paise in the domain; Indian grouping at the interface.
              </p>
            </div>
            <span className="amount" aria-label="499 Indian rupees">
              ₹499
            </span>
          </div>
          <div className="signal-row">
            <span className="rank">#02</span>
            <div>
              <strong>Confirmation remains authoritative</strong>
              <p>A browser return will never become a financial event.</p>
            </div>
            <span className="status status-success">CONFIRMED ONLY</span>
          </div>
          <div className="signal-row">
            <span className="rank">#03</span>
            <div>
              <strong>Production remains empty</strong>
              <p>No fabricated listings, clicks, urgency or social proof.</p>
            </div>
            <span className="status status-warning">GATED</span>
          </div>
        </section>

        <section
          id="tokens"
          className="token-section"
          aria-labelledby="token-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">SEMANTIC SYSTEM</p>
              <h2 id="token-title">Warm stone, hard rules.</h2>
            </div>
            <p className="section-note">
              WCAG-minded contrast · visible focus · reduced motion
            </p>
          </div>

          <div className="token-grid">
            {swatches.map((swatch) => (
              <article className="token-card" key={swatch.name}>
                <div
                  className={`swatch ${swatch.className}`}
                  aria-hidden="true"
                />
                <strong>{swatch.name}</strong>
                <code>{swatch.value}</code>
              </article>
            ))}
          </div>

          <div
            className="state-strip"
            aria-label="Interface state colour examples"
          >
            <span className="status status-success">CONFIRMED</span>
            <span className="status status-warning">VERIFYING</span>
            <span className="status status-danger">ACTION NEEDED</span>
            <a className="focus-demo" href="#top">
              Keyboard focus target
            </a>
          </div>
        </section>

        <footer>
          <p>No votes. No algorithm. No production integrations configured.</p>
          <p className="mono">SPEC 2026-08-28-v1 · ASIA/KOLKATA</p>
        </footer>
      </main>
    </>
  );
}
