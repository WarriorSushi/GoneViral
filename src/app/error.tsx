"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-shell">
      <section className="error-panel">
        <p className="eyebrow">REQUEST ERROR</p>
        <h1>The signal dropped.</h1>
        <p>
          Nothing financial is inferred from this error. Try the request again.
        </p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </main>
  );
}
