import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import type { Route } from "next";

import { getVerifiedAuthUser } from "@/server/auth/session";
import { getOwnerRaiseAttemptStatus } from "@/server/db/repositories/private/owners";

export default async function RaiseMockCheckout({
  params,
}: {
  params: Promise<{ publicId: string; slug: string }>;
}) {
  await connection();
  const user = await getVerifiedAuthUser();
  if (!user) redirect("/manage?error=session" as Route);
  const { publicId, slug } = await params;
  if (!(await getOwnerRaiseAttemptStatus(publicId, slug, user.id))) notFound();
  return (
    <main className="pending-main" id="main-content">
      <section className="pending-card">
        <p className="eyebrow">Local Dodo simulator</p>
        <h1>Complete this mock raise</h1>
        <p>The same signed webhook route fulfils this local raise.</p>
        <form action="/api/mock/dodo/complete" method="post">
          <input name="publicId" type="hidden" value={publicId} />
          <button className="button button-primary" type="submit">
            Complete mock payment
          </button>
        </form>
      </section>
    </main>
  );
}
