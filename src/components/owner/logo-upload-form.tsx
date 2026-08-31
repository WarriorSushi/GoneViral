"use client";

import { useState, useTransition } from "react";

import {
  finishLogoUpload,
  requestLogoIntent,
} from "@/app/manage/[slug]/edit/actions";
import { LogoCropField } from "@/components/shared/logo-crop-field";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoUploadForm({ slug }: { slug: string }) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="owner-logo-form"
      onSubmit={(event) => {
        event.preventDefault();
        const file = logoFile;
        if (!file)
          return setNotice({
            kind: "error",
            message: "Choose a JPEG, PNG or WebP image.",
          });
        startTransition(async () => {
          const intent = await requestLogoIntent(slug, file.type, file.size);
          if (intent.kind !== "created")
            return setNotice({ kind: "error", message: intent.message });
          const { error } = await createSupabaseBrowserClient()
            .storage.from(intent.bucket)
            .uploadToSignedUrl(intent.objectKey, intent.uploadToken, file, {
              contentType: file.type,
              upsert: false,
            });
          if (error) {
            return setNotice({
              kind: "error",
              message: "The private staging upload did not complete.",
            });
          }
          const result = await finishLogoUpload(slug, intent.finishToken);
          setNotice({
            kind: result.kind === "applied" ? "success" : "error",
            message:
              result.kind === "applied"
                ? "Sanitized logo published."
                : "message" in result
                  ? result.message
                  : "Logo processing did not complete.",
          });
        });
      }}
    >
      <LogoCropField disabled={pending} onFileReady={setLogoFile} required />
      <p className="field-help">
        Maximum 2 MiB. Position the image inside the square. We reject animation
        and unsafe formats, strip metadata, and publish only a new 128×128 WebP.
      </p>
      {notice ? (
        <p
          className={`form-notice ${notice.kind === "success" ? "success-notice" : "error-notice"}`}
          role={notice.kind === "success" ? "status" : "alert"}
        >
          {notice.message}
        </p>
      ) : null}
      <button
        className="button button-secondary"
        disabled={pending || !logoFile}
        type="submit"
      >
        {pending ? "Sanitizing…" : "Upload cropped logo"}
      </button>
    </form>
  );
}
