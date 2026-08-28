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
            <h1>GoneViral is down for now.</h1>
            <p>Please try again.</p>
            <button type="button" onClick={() => reset()}>
              Retry
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
