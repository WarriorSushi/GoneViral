"use client";

import { useActionState, useMemo } from "react";
import { useFormStatus } from "react-dom";

import {
  saveListingEdit,
  type ListingEditActionState,
} from "@/app/manage/[slug]/edit/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary" disabled={pending} type="submit">
      {pending ? "Saving…" : "Save safe changes"}
    </button>
  );
}

export function ListingEditForm({
  categories,
  listing,
}: {
  categories: readonly { name: string; slug: string }[];
  listing: {
    categorySlug: string;
    destinationUrl: string;
    name: string;
    slug: string;
    tagline: string;
  };
}) {
  const action = useMemo(
    () => saveListingEdit.bind(null, listing.slug),
    [listing.slug],
  );
  const [state, formAction] = useActionState<ListingEditActionState, FormData>(
    action,
    {},
  );
  return (
    <form action={formAction} className="owner-edit-form">
      <label>
        Display name
        <input
          defaultValue={listing.name}
          maxLength={80}
          name="name"
          required
        />
      </label>
      {state.errors?.name ? (
        <p className="field-error">{state.errors.name}</p>
      ) : null}
      <p className="field-help">
        Case and Unicode corrections can publish immediately. Material identity
        changes require review.
      </p>
      <label>
        Tagline
        <textarea
          defaultValue={listing.tagline}
          maxLength={160}
          name="tagline"
          required
          rows={3}
        />
      </label>
      {state.errors?.tagline ? (
        <p className="field-error">{state.errors.tagline}</p>
      ) : null}
      <label>
        Website URL
        <input
          defaultValue={listing.destinationUrl}
          name="destination"
          required
          type="url"
        />
      </label>
      {state.errors?.destination ? (
        <p className="field-error">{state.errors.destination}</p>
      ) : null}
      <p className="field-help">
        A path or query change on the approved host can publish immediately. A
        host change requires review and never triggers a server-side preview.
      </p>
      <label>
        Category
        <select defaultValue={listing.categorySlug} name="category">
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      {state.errors?.category ? (
        <p className="field-error">{state.errors.category}</p>
      ) : null}
      <p className="field-help">Category changes always require approval.</p>
      {state.message ? (
        <p
          className={state.ok ? "form-notice" : "form-notice error-notice"}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <Submit />
    </form>
  );
}
