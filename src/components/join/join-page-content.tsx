import { randomUUID } from "node:crypto";

import { connection } from "next/server";

import { readPublicEnv } from "@/config/env/public";
import { readServerEnv } from "@/config/env/server";
import { listActiveCategories } from "@/server/db/repositories/categories";
import { listMainBoard } from "@/server/db/repositories/leaderboards";

import { JoinForm } from "./join-form";

export async function JoinPageContent({
  presentation = "page",
  searchParams,
}: {
  readonly presentation?: "modal" | "page";
  readonly searchParams: Promise<{ target?: string }>;
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
  const content = (
    <>
      <header
        className={
          presentation === "modal"
            ? "join-intro join-modal-intro"
            : "join-intro"
        }
      >
        <p className="eyebrow">Get listed</p>
        <h1
          id={presentation === "modal" ? "join-dialog-title" : undefined}
          tabIndex={presentation === "modal" ? -1 : undefined}
        >
          Put your link where people can see it.
        </h1>
        <p>
          Share the essentials, pay ₹499 or more, then wait while we verify the
          payment.
        </p>
      </header>
      <JoinForm
        key={target?.slug ?? "new-listing"}
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
    </>
  );

  return presentation === "modal" ? (
    content
  ) : (
    <main id="main-content" className="join-main">
      {content}
    </main>
  );
}
