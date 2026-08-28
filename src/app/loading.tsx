export default function Loading() {
  return (
    <main
      className="error-shell"
      aria-busy="true"
      aria-label="Loading GoneViral"
    >
      <div>
        <p className="eyebrow">LOADING FOUNDATION</p>
        <div className="loading-bar" aria-hidden="true" />
      </div>
    </main>
  );
}
