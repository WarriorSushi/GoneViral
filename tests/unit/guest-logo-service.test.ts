import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({
  getSqlClient: vi.fn(),
}));

import {
  discardPreparedGuestLogo,
  prepareGuestLogo,
} from "@/server/storage/guest-logo-service";
import type { LogoStorage } from "@/server/storage/logo-storage";

class MemoryLogoStorage implements LogoStorage {
  readonly stagingObjects = new Map<string, Buffer>();

  async createSignedStagingUpload() {
    return { token: "unused" };
  }

  async downloadStaging(path: string) {
    const bytes = this.stagingObjects.get(path);
    if (!bytes) throw new Error("missing staging object");
    return bytes;
  }

  async removePublic() {}

  async removeStaging(paths: readonly string[]) {
    for (const path of paths) this.stagingObjects.delete(path);
  }

  async uploadPublic() {}

  async uploadStaging(path: string, bytes: Buffer) {
    this.stagingObjects.set(path, bytes);
  }
}

describe("guest checkout logo preparation", () => {
  it("stores only one sanitized private WebP and can discard it", async () => {
    const storage = new MemoryLogoStorage();
    const raw = await sharp({
      create: {
        background: { alpha: 0.5, b: 35, g: 90, r: 220 },
        channels: 4,
        height: 72,
        width: 96,
      },
    })
      .png()
      .toBuffer();

    const result = await prepareGuestLogo({
      bytes: raw,
      checkoutExpiresAt: new Date(Date.now() + 30 * 60_000),
      contentType: "image/png",
      storage,
    });

    expect(result.kind).toBe("prepared");
    if (result.kind !== "prepared") return;
    expect(storage.stagingObjects.size).toBe(1);
    const stored = storage.stagingObjects.get(result.value.stagingObjectKey);
    expect(stored).toBeDefined();
    if (!stored) return;
    expect(stored).not.toEqual(raw);
    await expect(sharp(stored).metadata()).resolves.toMatchObject({
      format: "webp",
      height: 128,
      width: 128,
    });

    await discardPreparedGuestLogo(result.value, storage);
    expect(storage.stagingObjects.size).toBe(0);
  });

  it("rejects unsafe input without storing it", async () => {
    const storage = new MemoryLogoStorage();
    const result = await prepareGuestLogo({
      bytes: Buffer.from("not an image"),
      checkoutExpiresAt: new Date(Date.now() + 30 * 60_000),
      contentType: "image/png",
      storage,
    });

    expect(result).toMatchObject({ kind: "rejected" });
    expect(storage.stagingObjects.size).toBe(0);
  });
});
