import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { connection } from "next/server";

import { JoinForm } from "@/components/join/join-form";
import { readPublicEnv } from "@/config/env/public";
import { readServerEnv } from "@/config/env/server";
import { listActiveCategories } from "@/server/db/repositories/categories";
import { listMainBoard } from "@/server/db/repositories/leaderboards";

export const metadata: Metadata = { title: "Join the list" };
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  await connection();
  const [categories, publicEnvironment, serverEnvironment, query, board] =
    await Promise.all([
      listActiveCategories(),
      Promise.resolve(readPublicEnv()),
      Promise.resolve(readServerEnv()),
      searchParams,
      listMainBoard({ cursor: null, limit: 50 }),
    ]);
  const localTurnstileToken =
    serverEnvironment.TURNSTILE_MODE === "mock"
      ? `local-pass-${randomUUID()}`
      : undefined;
  const target = board.entries.find((entry) => entry.slug === query.target);

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
        initialAmountRupees={
          target
            ? (
                BigInt(target.takeoverQuote.requiredPaymentPaise) / 100n
              ).toString()
            : "499"
        }
        {...(target
          ? {
              takeoverTarget: {
                name: target.name,
                rank: target.rank,
                slug: target.slug,
              },
            }
          : {})}
      />
    </main>
  );
}
