import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { LOGO_PUBLIC_BUCKET, LOGO_STAGING_BUCKET } from "./logo-policy";

export interface LogoStorage {
  createSignedStagingUpload(path: string): Promise<{ token: string }>;
  downloadStaging(path: string): Promise<Buffer>;
  removePublic(paths: readonly string[]): Promise<void>;
  removeStaging(paths: readonly string[]): Promise<void>;
  uploadPublic(path: string, bytes: Buffer): Promise<void>;
  uploadStaging(path: string, bytes: Buffer): Promise<void>;
}

export class SupabaseLogoStorage implements LogoStorage {
  private client() {
    return createSupabaseAdminClient();
  }

  async createSignedStagingUpload(path: string) {
    const { data, error } = await this.client()
      .storage.from(LOGO_STAGING_BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (error) throw new Error(`logo_staging_intent_failed:${error.name}`);
    if (!data?.token) throw new Error("logo_staging_intent_failed");
    return { token: data.token };
  }

  async downloadStaging(path: string) {
    const { data, error } = await this.client()
      .storage.from(LOGO_STAGING_BUCKET)
      .download(path);
    if (error || !data) throw new Error("logo_staging_download_failed");
    return Buffer.from(await data.arrayBuffer());
  }

  async uploadPublic(path: string, bytes: Buffer) {
    const { error } = await this.client()
      .storage.from(LOGO_PUBLIC_BUCKET)
      .upload(path, bytes, {
        cacheControl: "31536000, immutable",
        contentType: "image/webp",
        upsert: false,
      });
    if (error) throw new Error(`logo_public_upload_failed:${error.name}`);
  }

  async uploadStaging(path: string, bytes: Buffer) {
    const { error } = await this.client()
      .storage.from(LOGO_STAGING_BUCKET)
      .upload(path, bytes, {
        cacheControl: "0",
        contentType: "image/webp",
        upsert: false,
      });
    if (error) throw new Error(`logo_staging_upload_failed:${error.name}`);
  }

  async removeStaging(paths: readonly string[]) {
    if (paths.length === 0) return;
    const { error } = await this.client()
      .storage.from(LOGO_STAGING_BUCKET)
      .remove([...paths]);
    if (error) throw new Error(`logo_staging_remove_failed:${error.name}`);
  }

  async removePublic(paths: readonly string[]) {
    if (paths.length === 0) return;
    const { error } = await this.client()
      .storage.from(LOGO_PUBLIC_BUCKET)
      .remove([...paths]);
    if (error) throw new Error(`logo_public_remove_failed:${error.name}`);
  }
}
