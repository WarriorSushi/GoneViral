import "server-only";

import { createHmac } from "node:crypto";

import type postgres from "postgres";

import { readServerEnv } from "@/config/env/server";
import { canonicalizeDestination } from "@/domain/destination";
import { toIstBusinessDate } from "@/domain/today";
import { getSqlClient } from "@/server/db/client";
import { readOperationalFlag } from "@/server/operations/flags";

type Transaction = postgres.TransactionSql<{ bigint: bigint }>;

type EligibleListingRow = Readonly<{
  categorySlug: string;
  destinationUrl: string;
  id: string;
  publicId: string;
  slug: string;
}>;

export type OutboundResolution = Readonly<{
  categorySlug: string;
  destinationUrl: string;
  listingId: string;
  listingPublicId: string;
  slug: string;
}>;

const BOT_USER_AGENT =
  /(?:bot|crawler|spider|slurp|preview|facebookexternalhit|whatsapp|telegrambot|discordbot|linkedinbot|skypeuripreview|headless|lighthouse|pagespeed)/i;

export function shouldCountOutboundRequest(request: Request): boolean {
  if (request.method !== "GET") return false;

  const purpose = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`;
  if (/prefetch|prerender/i.test(purpose)) return false;
  if (
    request.headers.has("next-router-prefetch") ||
    request.headers.get("x-moz")?.toLowerCase() === "prefetch"
  ) {
    return false;
  }

  const userAgent = request.headers.get("user-agent")?.trim();
  return Boolean(userAgent && !BOT_USER_AGENT.test(userAgent));
}

export function clientAddress(request: Request): string | null {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return (
    forwarded ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-vercel-forwarded-for")?.trim() ||
    null
  );
}

export function outboundVisitorHmac(input: {
  businessDate: string;
  clientAddress: string;
  listingId: string;
  secret: string;
  userAgent: string;
}): string {
  return createHmac("sha256", input.secret)
    .update("goneviral:outbound-click:v1\0")
    .update(input.listingId)
    .update("\0")
    .update(input.businessDate)
    .update("\0")
    .update(input.clientAddress)
    .update("\0")
    .update(input.userAgent.slice(0, 512))
    .digest("hex");
}

export async function resolveEligibleOutboundSlug(
  slug: string,
): Promise<OutboundResolution | null> {
  if (!(await readOperationalFlag("outbound_redirects_enabled", true))) {
    return null;
  }

  const [listing] = await getSqlClient()<EligibleListingRow[]>`
    SELECT listing.id, listing.public_id AS "publicId", listing.slug,
           listing.destination_url AS "destinationUrl",
           category.slug AS "categorySlug"
    FROM app.listings AS listing
    JOIN app.categories AS category ON category.id = listing.category_id
    WHERE listing.slug = ${slug}
      AND listing.lifecycle_status = 'active'
      AND listing.moderation_status = 'clear'
      AND listing.confirmed_total_paise > 0
      AND category.is_active = true
    LIMIT 1
  `;
  if (!listing) return null;

  const destination = canonicalizeDestination(listing.destinationUrl);
  if (!destination.ok) return null;

  return {
    categorySlug: listing.categorySlug,
    destinationUrl: destination.value.url,
    listingId: listing.id,
    listingPublicId: listing.publicId,
    slug: listing.slug,
  };
}

async function recordUniqueClick(
  transaction: Transaction,
  input: {
    businessDate: string;
    currentHmac: string;
    listingId: string;
    previousHmac?: string;
  },
): Promise<boolean> {
  const knownHmacs = input.previousHmac
    ? [input.currentHmac, input.previousHmac]
    : [input.currentHmac];
  const [existing] = await transaction<{ present: number }[]>`
    SELECT 1 AS present
    FROM private.click_dedupe
    WHERE listing_id = ${input.listingId}
      AND business_date = ${input.businessDate}
      AND visitor_hmac IN ${transaction(knownHmacs)}
    LIMIT 1
  `;
  if (existing) return false;

  const inserted = await transaction<{ visitorHmac: string }[]>`
    INSERT INTO private.click_dedupe (
      listing_id, business_date, visitor_hmac, expires_at
    ) VALUES (
      ${input.listingId}, ${input.businessDate}, ${input.currentHmac},
      transaction_timestamp() + interval '8 days'
    )
    ON CONFLICT DO NOTHING
    RETURNING visitor_hmac AS "visitorHmac"
  `;
  if (inserted.length === 0) return false;

  await transaction`
    INSERT INTO app.listing_click_daily_totals (
      listing_id, business_date, unique_clicks
    ) VALUES (${input.listingId}, ${input.businessDate}, 1)
    ON CONFLICT (listing_id, business_date) DO UPDATE
    SET unique_clicks = app.listing_click_daily_totals.unique_clicks + 1,
        updated_at = transaction_timestamp()
  `;
  return true;
}

export async function countEligibleOutboundClick(input: {
  listing: OutboundResolution;
  now?: Date;
  request: Request;
}): Promise<{ businessDate: string; counted: boolean }> {
  const businessDate = toIstBusinessDate(input.now ?? new Date());
  const environment = readServerEnv();
  const address = clientAddress(input.request);
  const userAgent = input.request.headers.get("user-agent")?.trim() ?? "";

  if (
    !environment.CLICK_HMAC_SECRET_CURRENT ||
    !address ||
    !shouldCountOutboundRequest(input.request)
  ) {
    return { businessDate, counted: false };
  }

  const digestInput = {
    businessDate,
    clientAddress: address,
    listingId: input.listing.listingId,
    userAgent,
  };
  const currentHmac = outboundVisitorHmac({
    ...digestInput,
    secret: environment.CLICK_HMAC_SECRET_CURRENT,
  });
  const previousHmac = environment.CLICK_HMAC_SECRET_PREVIOUS
    ? outboundVisitorHmac({
        ...digestInput,
        secret: environment.CLICK_HMAC_SECRET_PREVIOUS,
      })
    : undefined;

  const counted = await getSqlClient().begin((transaction) =>
    recordUniqueClick(transaction, {
      businessDate,
      currentHmac,
      listingId: input.listing.listingId,
      ...(previousHmac ? { previousHmac } : {}),
    }),
  );
  return { businessDate, counted };
}

export async function deleteExpiredClickDedupe(now = new Date()) {
  const result = await getSqlClient()`
    DELETE FROM private.click_dedupe WHERE expires_at <= ${now}
  `;
  return result.count;
}
