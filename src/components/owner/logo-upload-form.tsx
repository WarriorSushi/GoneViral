"use client";

import { useRef, useState, useTransition } from "react";

import {
  finishLogoUpload,
  requestLogoIntent,
} from "@/app/manage/[slug]/edit/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoUploadForm({ slug }: { slug: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="owner-logo-form"
      onSubmit={(event) => {
        event.preventDefault();
        const file = fileRef.current?.files?.[0];
        if (!file) return setMessage("Choose a JPEG, PNG or WebP image.");
        startTransition(async () => {
          const intent = await requestLogoIntent(slug, file.type, file.size);
          if (intent.kind !== "created") return setMessage(intent.message);
          const { error } = await createSupabaseBrowserClient()
            .storage.from(intent.bucket)
            .uploadToSignedUrl(intent.objectKey, intent.uploadToken, file, {
              contentType: file.type,
              upsert: false,
            });
          if (error)
            return setMessage("The private staging upload did not complete.");
          const result = await finishLogoUpload(slug, intent.finishToken);
          setMessage(
            result.kind === "applied"
              ? "Sanitized logo published."
              : "message" in result
                ? result.message
                : "Logo processing did not complete.",
          );
        });
      }}
    >
      <label>
        Logo image
        <input
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          ref={fileRef}
          required
          type="file"
        />
      </label>
      <p className="field-help">
        Optional. Maximum 2 MiB. We reject animation and unsafe formats, then
        strip metadata and publish only a new 128×128 WebP.
      </p>
      {message ? (
        <p className="form-notice" role="status">
          {message}
        </p>
      ) : null}
      <button
        className="button button-secondary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Sanitizing…" : "Upload and sanitize logo"}
      </button>
    </form>
  );
}
