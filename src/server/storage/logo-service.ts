import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import { getSqlClient } from "@/server/db/client";
import { submissionDigest } from "@/server/security/submission-security";

import { sanitizeLogo } from "./logo-sanitizer";
import { signLogoUploadIntent } from "./logo-intent";
import {
  LOGO_INPUT_TYPES,
  LOGO_PUBLIC_BUCKET,
  LOGO_STAGING_BUCKET,
  LOGO_UPLOAD_INTENT_SECONDS,
} from "./logo-policy";
import type { LogoStorage } from "./logo-storage";

export type LogoUploadIntentResult =
  | Readonly<{
      bucket: typeof LOGO_STAGING_BUCKET;
      expiresAt: string;
      finishToken: string;
      kind: "created";
      objectKey: string;
      uploadToken: string;
    }>
  | Readonly<{ kind: "rejected"; message: string }>;

async function consumeLogoIntentRateLimit(userId: string) {
  const windowSeconds = 3_600;
  const startSeconds =
    Math.floor(Date.now() / 1_000 / windowSeconds) * windowSeconds;
  const [bucket] = await getSqlClient()<{ count: bigint }[]>`
    INSERT INTO private.rate_limit_buckets (
      scope, subject_hmac, window_start, count, expires_at
    ) VALUES (
      'owner_logo_intent', ${submissionDigest(userId)},
      ${new Date(startSeconds * 1_000).toISOString()}, 1,
      ${new Date((startSeconds + windowSeconds * 2) * 1_000).toISOString()}
    )
    ON CONFLICT (scope, subject_hmac, window_start)
    DO UPDATE SET count = private.rate_limit_buckets.count + 1
    RETURNING count
  `;
  return (bucket?.count ?? 11n) <= 10n;
}

export async function createLogoUploadIntent(input: {
  contentType: string;
  declaredBytes: number;
  listingSlug: string;
  storage: LogoStorage;
  userId: string;
}): Promise<LogoUploadIntentResult> {
  if (
    !LOGO_INPUT_TYPES.has(input.contentType) ||
    !Number.isSafeInteger(input.declaredBytes) ||
    input.declaredBytes < 1 ||
    input.declaredBytes > 2 * 1024 * 1024
  )
    return {
      kind: "rejected",
      message: "Use a JPEG, PNG or WebP image up to 2 MiB.",
    };
  if (!(await consumeLogoIntentRateLimit(input.userId)))
    return {
      kind: "rejected",
      message: "Too many logo upload attempts. Try again later.",
    };
  const sql = getSqlClient();
  const assetId = randomUUID();
  const expiresAt = new Date(Date.now() + LOGO_UPLOAD_INTENT_SECONDS * 1_000);
  const stagingObjectKey = `${input.userId}/${randomBytes(16).toString("hex")}`;
  const [created] = await sql<{ id: string }[]>`
    INSERT INTO app.listing_assets (
      id, listing_id, kind, state, staging_bucket, staging_object_key,
      content_type, byte_size, expires_at
    )
    SELECT ${assetId}, listing.id, 'logo', 'staged', ${LOGO_STAGING_BUCKET},
           ${stagingObjectKey}, ${input.contentType}, ${input.declaredBytes},
           ${expiresAt.toISOString()}
    FROM app.listings AS listing
    JOIN private.listing_owners AS ownership
      ON ownership.listing_id = listing.id
     AND ownership.user_id = ${input.userId}
     AND ownership.revoked_at IS NULL
    WHERE listing.slug = ${input.listingSlug}
      AND listing.lifecycle_status <> 'removed'
      AND NOT EXISTS (
        SELECT 1 FROM private.listing_change_requests AS request
        WHERE request.listing_id = listing.id
          AND request.change_type = 'logo'
          AND request.state = 'pending'
      )
    RETURNING id
  `;
  if (!created)
    return {
      kind: "rejected",
      message: "This listing cannot accept another logo change right now.",
    };
  let signedUpload: { token: string };
  try {
    signedUpload =
      await input.storage.createSignedStagingUpload(stagingObjectKey);
  } catch {
    await sql`
      UPDATE app.listing_assets SET state = 'rejected',
        rejection_code = 'storage_intent_failed', processed_at = now()
      WHERE id = ${assetId} AND state = 'staged'
    `;
    return {
      kind: "rejected",
      message: "Logo storage is unavailable. Try again later.",
    };
  }
  return {
    bucket: LOGO_STAGING_BUCKET,
    expiresAt: expiresAt.toISOString(),
    finishToken: signLogoUploadIntent({
      assetId,
      expiresAt: expiresAt.getTime(),
      userId: input.userId,
    }),
    kind: "created",
    objectKey: stagingObjectKey,
    uploadToken: signedUpload.token,
  };
}

type ProcessingAsset = {
  category_slug: string;
  id: string;
  listing_id: string;
  listing_public_id: string;
  listing_slug: string;
  staging_object_key: string;
};

export async function finalizeLogoUpload(input: {
  assetId: string;
  storage: LogoStorage;
  userId: string;
}) {
  const sql = getSqlClient();
  const processing = await sql.begin(async (transaction) => {
    const [asset] = await transaction<ProcessingAsset[]>`
      SELECT asset.id, asset.listing_id, asset.staging_object_key,
             listing.public_id AS listing_public_id,
             listing.slug AS listing_slug,
             category.slug AS category_slug
      FROM app.listing_assets AS asset
      JOIN app.listings AS listing ON listing.id = asset.listing_id
      JOIN app.categories AS category ON category.id = listing.category_id
      JOIN private.listing_owners AS ownership
        ON ownership.listing_id = listing.id
       AND ownership.user_id = ${input.userId}
       AND ownership.revoked_at IS NULL
      WHERE asset.id = ${input.assetId} AND asset.state = 'staged'
        AND asset.staging_bucket = ${LOGO_STAGING_BUCKET}
        AND asset.expires_at > now() AND listing.lifecycle_status <> 'removed'
      FOR UPDATE OF asset, listing
    `;
    if (!asset) return null;
    await transaction`
      UPDATE app.listing_assets SET state = 'processing'
      WHERE id = ${asset.id}
    `;
    return asset;
  });
  if (!processing)
    return {
      kind: "rejected",
      message: "This upload cannot be finalized.",
    } as const;

  let bytes: Buffer;
  try {
    bytes = await input.storage.downloadStaging(processing.staging_object_key);
  } catch {
    await sql`UPDATE app.listing_assets SET state = 'staged' WHERE id = ${processing.id} AND state = 'processing'`;
    return {
      kind: "unavailable",
      message: "Logo storage is unavailable. Your listing is unchanged.",
    } as const;
  }
  const claimedType = await readStagedContentType(processing.id);
  const sanitized = await sanitizeLogo(bytes, claimedType ?? "");
  if (!sanitized.ok) {
    await sql`
      UPDATE app.listing_assets SET state = 'rejected', rejection_code = ${sanitized.code},
        processed_at = transaction_timestamp()
      WHERE id = ${processing.id} AND state = 'processing'
    `;
    await input.storage
      .removeStaging([processing.staging_object_key])
      .catch(() => undefined);
    return {
      kind: "rejected",
      message: "That file could not be used safely.",
    } as const;
  }

  const publicObjectKey = `logos/${processing.listing_public_id}/${processing.id}.webp`;
  try {
    await input.storage.uploadPublic(publicObjectKey, sanitized.value.bytes);
    const result = await sql.begin(async (transaction) => {
      const [listing] = await transaction<
        {
          id: string;
          logo_asset_id: string | null;
          moderation_status: string;
          old_public_object_key: string | null;
        }[]
      >`
        SELECT listing.id, listing.logo_asset_id, listing.moderation_status,
               old_asset.public_object_key AS old_public_object_key
        FROM app.listings AS listing
        JOIN private.listing_owners AS ownership
          ON ownership.listing_id = listing.id
         AND ownership.user_id = ${input.userId}
         AND ownership.revoked_at IS NULL
        LEFT JOIN app.listing_assets AS old_asset
          ON old_asset.id = listing.logo_asset_id
        WHERE listing.id = ${processing.listing_id}
          AND listing.lifecycle_status <> 'removed'
        FOR UPDATE OF listing
      `;
      if (!listing) throw new Error("logo_owner_changed");
      await transaction`
        UPDATE app.listing_assets SET state = 'ready',
          public_bucket = ${LOGO_PUBLIC_BUCKET}, public_object_key = ${publicObjectKey},
          content_type = ${sanitized.value.contentType}, byte_size = ${sanitized.value.bytes.length},
          width = ${sanitized.value.width}, height = ${sanitized.value.height},
          sha256 = ${sanitized.value.sha256}, rejection_code = NULL,
          processed_at = transaction_timestamp()
        WHERE id = ${processing.id} AND state = 'processing'
      `;
      const immediate = listing.moderation_status === "clear";
      if (immediate) {
        await transaction`
          UPDATE app.listings SET logo_asset_id = ${processing.id},
            version = version + 1, updated_at = transaction_timestamp()
          WHERE id = ${listing.id}
        `;
        if (listing.logo_asset_id) {
          await transaction`
            UPDATE app.listing_assets SET state = 'orphaned'
            WHERE id = ${listing.logo_asset_id} AND state = 'ready'
          `;
        }
      }
      await transaction`
        INSERT INTO private.listing_change_requests (
          listing_id, requested_by_user_id, change_type, old_value,
          proposed_value, state, review_reason, reviewed_at
        ) VALUES (
          ${listing.id}, ${input.userId}, 'logo',
          ${JSON.stringify({ assetId: listing.logo_asset_id })}::jsonb,
          ${JSON.stringify({ assetId: processing.id })}::jsonb,
          ${immediate ? "approved" : "pending"},
          ${immediate ? "automatic_low_risk" : null},
          ${immediate ? new Date().toISOString() : null}
        )
      `;
      return {
        immediate,
        oldAssetId: listing.logo_asset_id,
        oldPublicObjectKey: listing.old_public_object_key,
      };
    });

    await input.storage
      .removeStaging([processing.staging_object_key])
      .catch(() => undefined);
    if (result.immediate && result.oldAssetId && result.oldPublicObjectKey) {
      try {
        await input.storage.removePublic([result.oldPublicObjectKey]);
        await sql`
          DELETE FROM app.listing_assets
          WHERE id = ${result.oldAssetId} AND state = 'orphaned'
            AND NOT EXISTS (
              SELECT 1 FROM app.listings WHERE logo_asset_id = ${result.oldAssetId}
            )
        `;
      } catch {
        // Daily cleanup retries unselected assets; the new safe logo stays live.
      }
    }
    return result.immediate
      ? ({
          categorySlug: processing.category_slug,
          kind: "applied",
          listingPublicId: processing.listing_public_id,
          listingSlug: processing.listing_slug,
        } as const)
      : ({
          kind: "review",
          message:
            "Your sanitized logo is awaiting review. The current public logo is unchanged.",
        } as const);
  } catch {
    await input.storage.removePublic([publicObjectKey]).catch(() => undefined);
    await sql`UPDATE app.listing_assets SET state = 'staged' WHERE id = ${processing.id} AND state = 'processing'`;
    return {
      kind: "unavailable",
      message: "Logo processing could not finish. Your listing is unchanged.",
    } as const;
  }
}

async function readStagedContentType(assetId: string) {
  const [row] = await getSqlClient()<{ content_type: string | null }[]>`
    SELECT content_type FROM app.listing_assets WHERE id = ${assetId}
  `;
  return row?.content_type ?? null;
}

export async function cleanupExpiredLogoAssets(
  storage: LogoStorage,
  limit = 100,
) {
  const rows = await getSqlClient()<
    {
      id: string;
      public_object_key: string | null;
      staging_object_key: string | null;
    }[]
  >`
    SELECT id, staging_object_key, public_object_key
    FROM app.listing_assets
    WHERE (
      state IN ('staged', 'processing', 'rejected') AND expires_at < now()
    ) OR state = 'orphaned'
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
  await storage.removeStaging(
    rows.flatMap((row) =>
      row.staging_object_key ? [row.staging_object_key] : [],
    ),
  );
  await storage.removePublic(
    rows.flatMap((row) =>
      row.public_object_key ? [row.public_object_key] : [],
    ),
  );
  if (rows.length > 0) {
    const ids = rows.map((row) => row.id);
    await getSqlClient()`
      DELETE FROM app.listing_assets AS asset
      WHERE asset.id = ANY(${ids}::uuid[])
        AND NOT EXISTS (
          SELECT 1 FROM app.listings WHERE logo_asset_id = asset.id
        )
    `;
  }
  return rows.length;
}
