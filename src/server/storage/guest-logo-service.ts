import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { getSqlClient } from "@/server/db/client";

import { sanitizeLogo, type SanitizedLogo } from "./logo-sanitizer";
import {
  LOGO_OUTPUT_SIZE,
  LOGO_PUBLIC_BUCKET,
  LOGO_STAGING_BUCKET,
} from "./logo-policy";
import type { LogoStorage } from "./logo-storage";

export type PreparedGuestLogo = Readonly<{
  assetId: string;
  expiresAt: Date;
  logo: SanitizedLogo;
  stagingObjectKey: string;
}>;

export async function prepareGuestLogo(input: {
  bytes: Buffer;
  checkoutExpiresAt: Date;
  contentType: string;
  storage: LogoStorage;
}) {
  const sanitized = await sanitizeLogo(input.bytes, input.contentType);
  if (!sanitized.ok) {
    return {
      kind: "rejected",
      message:
        "That logo could not be used safely. Choose a normal JPEG, PNG or WebP image up to 2 MB.",
    } as const;
  }

  const prepared: PreparedGuestLogo = {
    assetId: randomUUID(),
    expiresAt: new Date(
      Math.max(
        input.checkoutExpiresAt.getTime() + 24 * 60 * 60 * 1_000,
        Date.now() + 24 * 60 * 60 * 1_000,
      ),
    ),
    logo: sanitized.value,
    stagingObjectKey: `guest/${randomBytes(24).toString("hex")}`,
  };

  try {
    await input.storage.uploadStaging(
      prepared.stagingObjectKey,
      prepared.logo.bytes,
    );
  } catch {
    return {
      kind: "rejected",
      message: "Logo upload is temporarily unavailable. Try again shortly.",
    } as const;
  }

  return { kind: "prepared", value: prepared } as const;
}

export async function discardPreparedGuestLogo(
  prepared: PreparedGuestLogo | null,
  storage: LogoStorage,
) {
  if (!prepared) return;
  await storage
    .removeStaging([prepared.stagingObjectKey])
    .catch(() => undefined);
}

type PublishableLogo = {
  asset_id: string;
  byte_size: bigint;
  listing_id: string;
  listing_public_id: string;
  sha256: string;
  staging_object_key: string;
};

export async function publishPreparedGuestLogoForAttempt(
  attemptPublicId: string,
  storage: LogoStorage,
) {
  const sql = getSqlClient();
  const prepared = await sql.begin(async (transaction) => {
    const [asset] = await transaction<PublishableLogo[]>`
      SELECT asset.id AS asset_id, asset.byte_size, asset.sha256,
             asset.staging_object_key, listing.id AS listing_id,
             listing.public_id AS listing_public_id
      FROM private.payment_attempts AS attempt
      JOIN app.listings AS listing ON listing.id = attempt.listing_id
      JOIN app.listing_assets AS asset ON asset.listing_id = listing.id
      WHERE attempt.public_id = ${attemptPublicId}
        AND attempt.state = 'succeeded'
        AND listing.lifecycle_status = 'active'
        AND listing.moderation_status = 'clear'
        AND listing.logo_asset_id IS NULL
        AND asset.kind = 'logo' AND asset.state = 'staged'
        AND asset.staging_bucket = ${LOGO_STAGING_BUCKET}
        AND asset.content_type = 'image/webp'
        AND asset.width = ${LOGO_OUTPUT_SIZE}
        AND asset.height = ${LOGO_OUTPUT_SIZE}
        AND asset.sha256 IS NOT NULL
        AND asset.staging_object_key IS NOT NULL
      ORDER BY asset.created_at ASC
      LIMIT 1
      FOR UPDATE OF asset, listing
    `;
    if (!asset) return null;
    await transaction`
      UPDATE app.listing_assets SET state = 'processing'
      WHERE id = ${asset.asset_id} AND state = 'staged'
    `;
    return asset;
  });
  if (!prepared) return { kind: "nothing_to_publish" } as const;

  let bytes: Buffer;
  try {
    bytes = await storage.downloadStaging(prepared.staging_object_key);
  } catch {
    await sql`
      UPDATE app.listing_assets SET state = 'staged'
      WHERE id = ${prepared.asset_id} AND state = 'processing'
    `;
    return { kind: "retry" } as const;
  }

  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  if (
    actualSha256 !== prepared.sha256 ||
    BigInt(bytes.length) !== prepared.byte_size
  ) {
    await sql`
      UPDATE app.listing_assets SET state = 'rejected',
        rejection_code = 'staging_integrity_failed', processed_at = now()
      WHERE id = ${prepared.asset_id} AND state = 'processing'
    `;
    await storage
      .removeStaging([prepared.staging_object_key])
      .catch(() => undefined);
    return { kind: "rejected" } as const;
  }

  const publicObjectKey = `logos/${prepared.listing_public_id}/${prepared.asset_id}.webp`;
  try {
    await storage.uploadPublic(publicObjectKey, bytes);
    const published = await sql.begin(async (transaction) => {
      const [asset] = await transaction<{ id: string }[]>`
        SELECT asset.id
        FROM app.listing_assets AS asset
        JOIN app.listings AS listing ON listing.id = asset.listing_id
        WHERE asset.id = ${prepared.asset_id}
          AND asset.state = 'processing'
          AND listing.id = ${prepared.listing_id}
          AND listing.lifecycle_status = 'active'
          AND listing.moderation_status = 'clear'
          AND listing.logo_asset_id IS NULL
        FOR UPDATE OF asset, listing
      `;
      if (!asset) return false;
      await transaction`
        UPDATE app.listing_assets SET state = 'ready',
          public_bucket = ${LOGO_PUBLIC_BUCKET},
          public_object_key = ${publicObjectKey},
          processed_at = transaction_timestamp(), expires_at = NULL
        WHERE id = ${prepared.asset_id} AND state = 'processing'
      `;
      await transaction`
        UPDATE app.listings SET logo_asset_id = ${prepared.asset_id},
          version = version + 1, updated_at = transaction_timestamp()
        WHERE id = ${prepared.listing_id} AND logo_asset_id IS NULL
      `;
      return true;
    });
    if (!published) throw new Error("guest_logo_state_changed");
  } catch {
    await storage.removePublic([publicObjectKey]).catch(() => undefined);
    await sql`
      UPDATE app.listing_assets SET state = 'staged'
      WHERE id = ${prepared.asset_id} AND state = 'processing'
    `;
    return { kind: "retry" } as const;
  }

  await storage
    .removeStaging([prepared.staging_object_key])
    .catch(() => undefined);
  return {
    kind: "published",
    listingPublicId: prepared.listing_public_id,
  } as const;
}

export async function publishPreparedGuestLogos(
  storage: LogoStorage,
  limit = 25,
) {
  const attempts = await getSqlClient()<{ public_id: string }[]>`
    SELECT DISTINCT attempt.public_id
    FROM private.payment_attempts AS attempt
    JOIN app.listings AS listing ON listing.id = attempt.listing_id
    JOIN app.listing_assets AS asset ON asset.listing_id = listing.id
    WHERE attempt.state = 'succeeded'
      AND listing.lifecycle_status = 'active'
      AND listing.moderation_status = 'clear'
      AND listing.logo_asset_id IS NULL
      AND asset.state = 'staged' AND asset.content_type = 'image/webp'
      AND asset.width = ${LOGO_OUTPUT_SIZE}
      AND asset.height = ${LOGO_OUTPUT_SIZE}
      AND asset.sha256 IS NOT NULL
    ORDER BY attempt.public_id
    LIMIT ${limit}
  `;
  let published = 0;
  for (const attempt of attempts) {
    const result = await publishPreparedGuestLogoForAttempt(
      attempt.public_id,
      storage,
    );
    if (result.kind === "published") published += 1;
  }
  return published;
}
