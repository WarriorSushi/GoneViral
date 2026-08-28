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
        <h1>Return from checkout</h1>
        <p>
          This local page does not mark a payment successful. It only exercises
          the safe return and pending flow.
        </p>
        <a className="button button-primary" href={`/join/${publicId}/return`}>
          Return to GoneViral.in
        </a>
      </div>
    </main>
  );
}
