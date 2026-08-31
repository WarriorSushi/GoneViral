import { notFound } from "next/navigation";
import { connection } from "next/server";

import { getPublicAttemptStatus } from "@/server/db/repositories/private/guest-checkout";
import { PaymentBrand } from "@/components/payment/payment-brand";
import { readPublicEnv } from "@/config/env/public";
import { readServerEnv } from "@/config/env/server";

export const instant = false;

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
        <PaymentBrand />
        <header className="payment-status-header">
          <span className="pending-mark" aria-hidden="true">
            TEST
          </span>
          <p className="eyebrow">Local payment test</p>
          <h1>Choose what happens next.</h1>
          <p>
            This page is only available during local testing. No real payment
            will be made.
          </p>
        </header>
        <form action="/api/mock/dodo/complete" method="post">
          <input name="publicId" type="hidden" value={publicId} />
          <button className="button button-primary" type="submit">
            Mark test payment complete
          </button>
        </form>
        <a
          className="button button-secondary"
          href={`/join/${publicId}/return`}
        >
          Leave payment unfinished
        </a>
      </div>
    </main>
  );
}
