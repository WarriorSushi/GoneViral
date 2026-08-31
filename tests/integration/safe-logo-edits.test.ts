import { randomUUID } from "node:crypto";

import postgres from "postgres";
import sharp from "sharp";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import type { ListingEditInput } from "@/domain/listing-edit";
import type { LogoStorage } from "@/server/storage/logo-storage";

const directDatabaseUrl =
  process.env.DATABASE_DIRECT_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.DATABASE_DIRECT_URL ??= directDatabaseUrl;
process.env.DATABASE_URL ??=
  "postgresql://postgres.pooler-dev:postgres@127.0.0.1:54329/postgres";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??=
  "phase8-local-publishable-key";
process.env.SUBMISSION_HMAC_SECRET ??= "phase8-integration-logo-signing-secret";

const directSql = postgres(directDatabaseUrl, {
  max: 2,
  prepare: false,
  types: { bigint: postgres.BigInt },
});
const fixtureListingIds: string[] = [];
const fixtureUserIds: string[] = [];

class MemoryLogoStorage implements LogoStorage {
  readonly publicObjects = new Map<string, Buffer>();
  readonly removedPublic: string[] = [];
  readonly stagingObjects = new Map<string, Buffer>();

  async createSignedStagingUpload(path: string) {
    return { token: `signed:${path}` };
  }

  async downloadStaging(path: string) {
    const value = this.stagingObjects.get(path);
    if (!value) throw new Error("missing staging object");
    return value;
  }

  async removePublic(paths: readonly string[]) {
    for (const path of paths) {
      this.publicObjects.delete(path);
      this.removedPublic.push(path);
    }
  }

  async removeStaging(paths: readonly string[]) {
    for (const path of paths) this.stagingObjects.delete(path);
  }

  async uploadPublic(path: string, bytes: Buffer) {
    if (this.publicObjects.has(path))
      throw new Error("duplicate public object");
    this.publicObjects.set(path, bytes);
  }

  async uploadStaging(path: string, bytes: Buffer) {
    if (this.stagingObjects.has(path))
      throw new Error("duplicate staging object");
    this.stagingObjects.set(path, bytes);
  }
}

async function createVerifiedUser() {
  const email = `phase8-${randomUUID()}@example.test`;
  const response = await fetch("http://127.0.0.1:54321/auth/v1/signup", {
    body: JSON.stringify({ email, password: `local-${randomUUID()}` }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok)
    throw new Error(`Local Auth signup failed: ${response.status}`);
  const body = (await response.json()) as { user: { id: string } };
  fixtureUserIds.push(body.user.id);
  return body.user.id;
}

async function createOwnedListing(userId: string, moderationStatus = "clear") {
  const suffix = randomUUID();
  const [listing] = await directSql<
    { id: string; public_id: string; slug: string }[]
  >`
    INSERT INTO app.listings (
      public_id, slug, name, name_normalized, tagline, destination_url,
      destination_canonical_key, destination_host, category_id,
      lifecycle_status, moderation_status, confirmed_total_paise,
      original_sponsorship_paise, current_total_reached_at,
      first_confirmed_at, category_locked_at
    ) VALUES (
      ${`phase8-public-${suffix}`}, ${`phase8-listing-${suffix}`},
      'Phase 8 Studio', 'phase 8 studio', 'Original tagline',
      ${`https://phase8-${suffix}.example.test/original`},
      ${`https://phase8-${suffix}.example.test/original`},
      ${`phase8-${suffix}.example.test`},
      '00000000-0000-4000-8000-000000000002',
      'active', ${moderationStatus}, 49900, 49900, now(), now(), now()
    ) RETURNING id, public_id, slug
  `;
  if (!listing) throw new Error("Phase 8 listing fixture was not created.");
  fixtureListingIds.push(listing.id);
  await directSql`
    INSERT INTO private.listing_owners (listing_id, user_id)
    VALUES (${listing.id}, ${userId})
  `;
  return listing;
}

async function safePng() {
  return sharp({
    create: { background: "#2940d3", channels: 4, height: 80, width: 100 },
  })
    .png()
    .toBuffer();
}

async function uploadAndFinalize(
  listingSlug: string,
  userId: string,
  storage: MemoryLogoStorage,
) {
  const { verifyLogoUploadIntent } =
    await import("@/server/storage/logo-intent");
  const { createLogoUploadIntent, finalizeLogoUpload } =
    await import("@/server/storage/logo-service");
  const bytes = await safePng();
  const intent = await createLogoUploadIntent({
    contentType: "image/png",
    declaredBytes: bytes.length,
    listingSlug,
    storage,
    userId,
  });
  if (intent.kind !== "created") throw new Error(intent.message);
  const payload = verifyLogoUploadIntent(intent.finishToken);
  if (!payload) throw new Error("Logo intent did not verify.");
  expect(intent.objectKey).toMatch(new RegExp(`^${userId}/[a-f0-9]{32}$`));
  expect(intent.uploadToken).toBe(`signed:${intent.objectKey}`);
  storage.stagingObjects.set(intent.objectKey, bytes);
  return {
    assetId: payload.assetId,
    result: await finalizeLogoUpload({
      assetId: payload.assetId,
      storage,
      userId,
    }),
  };
}

async function cleanupFixtures() {
  await directSql`
    DELETE FROM private.rate_limit_buckets WHERE scope = 'owner_logo_intent'
  `;
  if (fixtureListingIds.length > 0) {
    await directSql`
      DELETE FROM private.listing_change_requests
      WHERE listing_id = ANY(${fixtureListingIds}::uuid[])
    `;
    await directSql`
      UPDATE app.listings SET logo_asset_id = NULL
      WHERE id = ANY(${fixtureListingIds}::uuid[])
    `;
    await directSql`
      DELETE FROM app.listing_assets
      WHERE listing_id = ANY(${fixtureListingIds}::uuid[])
    `;
    await directSql`
      DELETE FROM private.listing_owners
      WHERE listing_id = ANY(${fixtureListingIds}::uuid[])
    `;
    await directSql`
      DELETE FROM app.listings WHERE id = ANY(${fixtureListingIds}::uuid[])
    `;
    fixtureListingIds.length = 0;
  }
  if (fixtureUserIds.length > 0) {
    await directSql`DELETE FROM auth.users WHERE id = ANY(${fixtureUserIds}::uuid[])`;
    fixtureUserIds.length = 0;
  }
}

beforeAll(async () => {
  const health = await fetch("http://127.0.0.1:54321/auth/v1/health");
  if (!health.ok) throw new Error("Local Supabase Auth is required.");
});

afterEach(cleanupFixtures);

afterAll(async () => {
  await cleanupFixtures();
  const { closeDatabase } = await import("@/server/db/client");
  await closeDatabase();
  await directSql.end({ timeout: 5 });
});

describe("Phase 8 safe owner edits", () => {
  it("keeps the paid listing intact when optional logo storage is unavailable", async () => {
    const userId = await createVerifiedUser();
    const listing = await createOwnedListing(userId);
    const storage = new MemoryLogoStorage();
    vi.spyOn(storage, "createSignedStagingUpload").mockRejectedValueOnce(
      new Error("storage unavailable"),
    );
    const { createLogoUploadIntent } =
      await import("@/server/storage/logo-service");
    await expect(
      createLogoUploadIntent({
        contentType: "image/png",
        declaredBytes: 1_024,
        listingSlug: listing.slug,
        storage,
        userId,
      }),
    ).resolves.toEqual({
      kind: "rejected",
      message: "Logo storage is unavailable. Try again later.",
    });
    const [after] = await directSql<
      {
        confirmed_total_paise: bigint;
        lifecycle_status: string;
        logo_asset_id: string | null;
      }[]
    >`
      SELECT confirmed_total_paise, lifecycle_status, logo_asset_id
      FROM app.listings WHERE id = ${listing.id}
    `;
    expect(after).toEqual({
      confirmed_total_paise: 49_900n,
      lifecycle_status: "active",
      logo_asset_id: null,
    });
  });

  it("publishes only low-risk changes and deduplicates reviewed identity changes", async () => {
    const userId = await createVerifiedUser();
    const outsiderId = await createVerifiedUser();
    const listing = await createOwnedListing(userId);
    const host = new URL(
      (
        await directSql<{ destination_url: string }[]>`
        SELECT destination_url FROM app.listings WHERE id = ${listing.id}
      `
      )[0]!.destination_url,
    ).host;
    const edit: ListingEditInput = {
      categorySlug: "brands-d2c",
      destination: {
        canonicalKey: `https://${host}/new-safe-path`,
        host,
        url: `https://${host}/new-safe-path`,
      },
      name: "Completely New Identity",
      tagline: "Published safe tagline",
    };
    const { editOwnedListing } = await import("@/server/listings/edit-listing");

    await expect(
      editOwnedListing({ edit, listingSlug: listing.slug, userId: outsiderId }),
    ).resolves.toMatchObject({ kind: "rejected" });
    await expect(
      editOwnedListing({ edit, listingSlug: listing.slug, userId }),
    ).resolves.toMatchObject({
      immediateCount: 2,
      kind: "saved",
      reviewCount: 2,
    });
    await expect(
      editOwnedListing({ edit, listingSlug: listing.slug, userId }),
    ).resolves.toMatchObject({
      immediateCount: 0,
      kind: "saved",
      reviewCount: 0,
    });

    const [live] = await directSql`
      SELECT listing.name, listing.tagline, listing.destination_url,
             category.slug AS category_slug
      FROM app.listings AS listing
      JOIN app.categories AS category ON category.id = listing.category_id
      WHERE listing.id = ${listing.id}
    `;
    expect(live).toMatchObject({
      category_slug: "tech-apps",
      destination_url: `https://${host}/new-safe-path`,
      name: "Phase 8 Studio",
      tagline: "Published safe tagline",
    });
    const pending = await directSql`
      SELECT change_type FROM private.listing_change_requests
      WHERE listing_id = ${listing.id} AND state = 'pending'
      ORDER BY change_type
    `;
    expect(pending.map((row) => row.change_type)).toEqual(["category", "name"]);

    const duplicate = await createOwnedListing(userId);
    const [duplicateDestination] = await directSql<
      {
        destination_canonical_key: string;
        destination_host: string;
        destination_url: string;
      }[]
    >`
      SELECT destination_canonical_key, destination_host, destination_url
      FROM app.listings WHERE id = ${duplicate.id}
    `;
    await expect(
      editOwnedListing({
        edit: {
          ...edit,
          destination: {
            canonicalKey: duplicateDestination!.destination_canonical_key,
            host: duplicateDestination!.destination_host,
            url: duplicateDestination!.destination_url,
          },
        },
        listingSlug: listing.slug,
        userId,
      }),
    ).resolves.toMatchObject({ kind: "rejected" });
  });

  it("binds upload intents to the owner and replaces only ready sanitized logos", async () => {
    const userId = await createVerifiedUser();
    const outsiderId = await createVerifiedUser();
    const listing = await createOwnedListing(userId);
    const storage = new MemoryLogoStorage();
    const { verifyLogoUploadIntent } =
      await import("@/server/storage/logo-intent");
    const { createLogoUploadIntent, finalizeLogoUpload } =
      await import("@/server/storage/logo-service");
    const bytes = await safePng();
    const intent = await createLogoUploadIntent({
      contentType: "image/png",
      declaredBytes: bytes.length,
      listingSlug: listing.slug,
      storage,
      userId,
    });
    if (intent.kind !== "created") throw new Error(intent.message);
    const payload = verifyLogoUploadIntent(intent.finishToken)!;
    expect(intent.objectKey).toMatch(new RegExp(`^${userId}/[a-f0-9]{32}$`));
    storage.stagingObjects.set(intent.objectKey, bytes);
    await expect(
      finalizeLogoUpload({
        assetId: payload.assetId,
        storage,
        userId: outsiderId,
      }),
    ).resolves.toMatchObject({ kind: "rejected" });
    await expect(
      finalizeLogoUpload({ assetId: payload.assetId, storage, userId }),
    ).resolves.toMatchObject({
      kind: "applied",
      listingPublicId: listing.public_id,
    });

    const second = await uploadAndFinalize(listing.slug, userId, storage);
    expect(second.result).toMatchObject({ kind: "applied" });
    const [selected] = await directSql`
      SELECT listing.logo_asset_id, current_asset.state,
             (SELECT count(*) FROM app.listing_assets old_asset
              WHERE old_asset.id = ${payload.assetId}) AS old_count
      FROM app.listings AS listing
      JOIN app.listing_assets AS current_asset ON current_asset.id = listing.logo_asset_id
      WHERE listing.id = ${listing.id}
    `;
    expect(selected).toMatchObject({
      logo_asset_id: second.assetId,
      old_count: 0n,
      state: "ready",
    });
    expect(storage.removedPublic).toHaveLength(1);

    const { listMainBoard } =
      await import("@/server/db/repositories/leaderboards");
    const board = await listMainBoard({ cursor: null, limit: 50 });
    expect(
      board.entries.find((entry) => entry.publicId === listing.public_id)
        ?.logoUrl,
    ).toContain(`${second.assetId}.webp`);
  });

  it("keeps the current logo live when listing moderation requires review", async () => {
    const userId = await createVerifiedUser();
    const listing = await createOwnedListing(userId, "pending_review");
    const storage = new MemoryLogoStorage();
    const uploaded = await uploadAndFinalize(listing.slug, userId, storage);
    expect(uploaded.result).toMatchObject({ kind: "review" });
    const [state] = await directSql`
      SELECT listing.logo_asset_id, asset.state,
             request.state AS request_state
      FROM app.listings AS listing
      JOIN app.listing_assets AS asset ON asset.id = ${uploaded.assetId}
      JOIN private.listing_change_requests AS request
        ON request.listing_id = listing.id AND request.change_type = 'logo'
      WHERE listing.id = ${listing.id}
    `;
    expect(state).toMatchObject({
      logo_asset_id: null,
      request_state: "pending",
      state: "ready",
    });
  });

  it("rejects incomplete ready assets and selecting unsanitized assets", async () => {
    const userId = await createVerifiedUser();
    const listing = await createOwnedListing(userId);
    const stagedId = randomUUID();
    await directSql`
      INSERT INTO app.listing_assets (
        id, listing_id, kind, state, staging_bucket, staging_object_key, expires_at
      ) VALUES (
        ${stagedId}, ${listing.id}, 'logo', 'staged',
        'goneviral-logo-staging', ${`${userId}/${randomUUID()}`}, now() + interval '5 minutes'
      )
    `;
    await expect(
      directSql`UPDATE app.listings SET logo_asset_id = ${stagedId} WHERE id = ${listing.id}`,
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      directSql`
        UPDATE app.listing_assets SET state = 'ready', public_bucket = 'wrong-bucket'
        WHERE id = ${stagedId}
      `,
    ).rejects.toMatchObject({ code: "23514" });

    const storage = new MemoryLogoStorage();
    const [staged] = await directSql<{ staging_object_key: string }[]>`
      UPDATE app.listing_assets SET expires_at = now() - interval '1 minute'
      WHERE id = ${stagedId} RETURNING staging_object_key
    `;
    storage.stagingObjects.set(
      staged!.staging_object_key,
      Buffer.from("expired"),
    );
    const { cleanupExpiredLogoAssets } =
      await import("@/server/storage/logo-service");
    await expect(cleanupExpiredLogoAssets(storage)).resolves.toBe(1);
    expect(storage.stagingObjects.size).toBe(0);
    const [remaining] = await directSql<{ count: bigint }[]>`
      SELECT count(*) AS count FROM app.listing_assets WHERE id = ${stagedId}
    `;
    expect(remaining?.count).toBe(0n);
  });
});
