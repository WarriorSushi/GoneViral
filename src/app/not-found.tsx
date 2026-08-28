import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-shell">
      <section className="error-panel">
        <h1>Page not found.</h1>
        <p>We could not find this page.</p>
        <Link className="text-link" href="/">
          Go to the list
        </Link>
      </section>
    </main>
  );
}
