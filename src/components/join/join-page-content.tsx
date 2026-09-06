import { randomUUID } from "node:crypto";

import { connection } from "next/server";

import { readPublicEnv } from "@/config/env/public";
import { readServerEnv } from "@/config/env/server";
import { moneyPaise } from "@/domain/money";
import { INITIAL_SPONSORSHIP_MIN_PAISE } from "@/domain/policy";
import { calculateTakeoverQuote, isRankingScope } from "@/domain/ranking";
import { toIstBusinessDate } from "@/domain/today";
import { getCachedPublicListingDetail } from "@/server/cache/public-read-model";
import { listActiveCategories } from "@/server/db/repositories/categories";

import { JoinForm } from "./join-form";

export async function JoinPageContent({
  presentation = "page",
  searchParams,
}: {
  readonly presentation?: "modal" | "page";
  readonly searchParams: Promise<{ scope?: string; target?: string }>;
}) {
  await connection();
  const [categories, publicEnvironment, serverEnvironment, query] =
    await Promise.all([
      listActiveCategories(),
      Promise.resolve(readPublicEnv()),
      Promise.resolve(readServerEnv()),
      searchParams,
    ]);
  const localTurnstileToken =
    serverEnvironment.TURNSTILE_MODE === "mock"
      ? `local-pass-${randomUUID()}`
      : undefined;
  const targetScope =
    query.target && query.scope && isRankingScope(query.scope)
      ? query.scope
      : "all_time";
  const target = query.target
    ? await getCachedPublicListingDetail(
        query.target,
        toIstBusinessDate(new Date()),
      )
    : null;
  const targetScore =
    targetScope === "daily"
      ? target?.todayNetPaise
      : target?.confirmedTotalPaise;
  const targetRank =
    targetScope === "daily" ? target?.todayRank : target?.currentMainRank;
  const quote =
    target && targetScore && targetRank
      ? calculateTakeoverQuote({
          listingCurrentTotalPaise: moneyPaise(0n),
          minimumRequiredPaise: moneyPaise(INITIAL_SPONSORSHIP_MIN_PAISE),
          targetTotalPaise: moneyPaise(BigInt(targetScore)),
        })
      : null;
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
          Get on the board.
        </h1>
        <p>
          Add your listing and choose an amount from ₹499. Placement starts
          after payment is confirmed.
        </p>
      </header>
      <JoinForm
        key={quote ? `${target?.slug}-${targetScope}` : "new-listing"}
        categories={categories}
        idempotencyKey={randomUUID()}
        localTurnstileToken={localTurnstileToken}
        turnstileSiteKey={publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        initialAmountRupees={
          quote ? (quote.requiredPaymentPaise / 100n).toString() : "499"
        }
        {...(target && quote && targetRank
          ? {
              takeoverTarget: {
                name: target.name,
                rank: targetRank,
                scope: targetScope,
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
