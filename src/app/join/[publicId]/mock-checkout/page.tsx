import { notFound } from "next/navigation";
import { connection } from "next/server";

import { getPublicAttemptStatus } from "@/server/db/repositories/private/guest-checkout";
import { readPublicEnv } from "@/config/env/public";
import { readServerEnv } from "@/config/env/server";

export default async function MockCheckoutPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await connection();
  const { publicId } = await params;
  const attempt = await getPublicAttemptStatus(publicId);
  const siteHostname = new URL(readPublicEnv().NEXT_PUBLIC_SITE_URL).hostname;
  if (
    !attempt ||
    readServerEnv().DODO_PAYMENTS_ENVIRONMENT !== "mock" ||
    !new Set(["127.0.0.1", "localhost"]).has(siteHostname)
  )
    notFound();
  return (
    <main id="main-content" className="pending-main">
      <div className="pending-card">
        <p className="eyebrow">Local checkout simulator</p>
        <h1>Complete a mock payment</h1>
        <p>
          This local-only simulator sends a correctly signed Standard Webhooks
          event through the same Dodo webhook path used by test mode.
        </p>
        <form action="/api/mock/dodo/complete" method="post">
          <input name="publicId" type="hidden" value={publicId} />
          <button className="button button-primary" type="submit">
            Complete mock payment
          </button>
        </form>
        <a
          className="button button-secondary"
          href={`/join/${publicId}/return`}
        >
          Return without paying
        </a>
      </div>
    </main>
  );
}
