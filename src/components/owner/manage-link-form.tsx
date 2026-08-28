"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { requestManageLink } from "@/app/manage/actions";
import type { ManageLinkState } from "@/app/manage/manage-link-state";

const initialState: ManageLinkState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary" disabled={pending} type="submit">
      {pending ? "Sending…" : "Send secure link"}
    </button>
  );
}

export function ManageLinkForm() {
  const [state, action] = useActionState(requestManageLink, initialState);
  return (
    <form action={action} className="manage-link-form">
      <label htmlFor="manage-email">Email used to sponsor</label>
      <input
        aria-describedby="manage-email-help"
        autoComplete="email"
        id="manage-email"
        inputMode="email"
        name="email"
        required
        type="email"
      />
      <p className="field-help" id="manage-email-help">
        We send a one-time Supabase sign-in link. There is no password.
      </p>
      {state.fieldError ? (
        <p className="field-error" role="alert">
          {state.fieldError}
        </p>
      ) : null}
      {state.message ? (
        <p className="form-notice" role="status">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
