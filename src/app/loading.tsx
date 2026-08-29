export default function Loading() {
  return (
    <main className="public-main loading-shell" aria-busy="true">
      <p className="visually-hidden" role="status">
        Loading this page…
      </p>
      <div className="loading-heading" aria-hidden="true">
        <div />
        <div />
      </div>
      <div className="loading-controls" aria-hidden="true" />
      <div className="loading-rows" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} />
        ))}
      </div>
    </main>
  );
}
