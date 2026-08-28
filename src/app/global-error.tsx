"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-IN">
      <body>
        <main className="error-shell">
          <section className="error-panel">
            <p className="eyebrow">APPLICATION ERROR</p>
            <h1>GoneViral is temporarily unavailable.</h1>
            <p>
              No payment or ranking state is shown unless it is confirmed by the
              server.
            </p>
            <button type="button" onClick={() => reset()}>
              Retry
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
