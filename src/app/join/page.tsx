import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { connection } from "next/server";

import { JoinForm } from "@/components/join/join-form";
import { readPublicEnv } from "@/config/env/public";
import { readServerEnv } from "@/config/env/server";
import { listActiveCategories } from "@/server/db/repositories/categories";

export const metadata: Metadata = { title: "Join the list" };
export default async function JoinPage() {
  await connection();
  const [categories, publicEnvironment, serverEnvironment] = await Promise.all([
    listActiveCategories(),
    Promise.resolve(readPublicEnv()),
    Promise.resolve(readServerEnv()),
  ]);
  const localTurnstileToken =
    serverEnvironment.TURNSTILE_MODE === "mock"
      ? `local-pass-${randomUUID()}`
      : undefined;

  return (
    <main id="main-content" className="join-main">
      <header className="join-intro">
        <p className="eyebrow">Join the leaderboard</p>
        <h1>Put your link where people can see it.</h1>
        <p>
          Share the essentials, pay ₹499 or more, then wait while we verify the
          payment.
        </p>
      </header>
      <JoinForm
        categories={categories}
        idempotencyKey={randomUUID()}
        localTurnstileToken={localTurnstileToken}
        turnstileSiteKey={publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
    </main>
  );
}
