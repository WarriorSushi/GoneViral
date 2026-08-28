import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-shell">
      <section className="error-panel">
        <p className="eyebrow">404 · NOT FOUND</p>
        <h1>This signal is off the board.</h1>
        <p>The requested page does not exist or is not publicly available.</p>
        <Link className="primary-action" href="/">
          Return to the foundation
        </Link>
      </section>
    </main>
  );
}
