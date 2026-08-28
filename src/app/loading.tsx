export default function Loading() {
  return (
    <main
      className="error-shell"
      aria-busy="true"
      aria-label="Loading GoneViral"
    >
      <div>
        <p>Loading…</p>
        <div className="loading-bar" aria-hidden="true" />
      </div>
    </main>
  );
}
