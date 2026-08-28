"use client";

import Link from "next/link";
import Script from "next/script";
import { useActionState } from "react";

import type { PublicCategory } from "@/server/db/repositories/public-types";

import { submitJoinForm, type JoinActionState } from "@/app/join/actions";

const initialState: JoinActionState = {};

function FieldError({ message }: { message: string | undefined }) {
  return message ? <p className="field-error">{message}</p> : null;
}

export function JoinForm({
  categories,
  idempotencyKey,
  localTurnstileToken,
  turnstileSiteKey,
}: {
  categories: PublicCategory[];
  idempotencyKey: string;
  localTurnstileToken: string | undefined;
  turnstileSiteKey: string | undefined;
}) {
  const [state, action, pending] = useActionState(submitJoinForm, initialState);

  return (
    <form action={action} className="join-form" noValidate>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {localTurnstileToken ? (
        <input
          type="hidden"
          name="turnstileToken"
          value={localTurnstileToken}
        />
      ) : null}

      <fieldset>
        <legend>
          <span>1</span> Your listing
        </legend>
        <div className="form-grid">
          <label>
            Name
            <input
              name="name"
              maxLength={160}
              autoComplete="organization"
              required
            />
            <FieldError message={state.errors?.name} />
          </label>
          <label>
            Category
            <select name="category" defaultValue="" required>
              <option value="" disabled>
                Choose one
              </option>
              {categories.map((category) => (
                <option value={category.slug} key={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.category} />
          </label>
          <label className="form-wide">
            Tagline
            <input name="tagline" maxLength={320} required />
            <FieldError message={state.errors?.tagline} />
          </label>
          <label className="form-wide">
            Website URL
            <input
              name="destination"
              type="url"
              inputMode="url"
              placeholder="https://example.com"
              required
            />
            <FieldError message={state.errors?.destination} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>
          <span>2</span> Payment contact
        </legend>
        <p className="field-help">
          Private. Used for payment and recovery only.
        </p>
        <div className="form-grid">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
            <FieldError message={state.errors?.email} />
          </label>
          <label>
            Phone
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+919876543210"
              required
            />
            <FieldError message={state.errors?.phone} />
          </label>
          <label className="amount-field">
            Amount (₹)
            <input
              name="amount"
              type="number"
              inputMode="numeric"
              min="499"
              max="21474836"
              step="1"
              defaultValue="499"
              required
            />
            <FieldError message={state.errors?.amount} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>
          <span>3</span> Review
        </legend>
        <p className="field-help">
          Payment buys leaderboard placement. It does not promise clicks, sales,
          or a permanent rank.
        </p>
        <label className="check-row">
          <input name="termsAccepted" type="checkbox" value="yes" required />
          <span>
            I accept the <Link href="/terms">terms</Link>,{" "}
            <Link href="/privacy">privacy policy</Link>,{" "}
            <Link href="/refunds">refund policy</Link>, and{" "}
            <Link href="/content-policy">content policy</Link>.
          </span>
        </label>
        <FieldError message={state.errors?.terms} />
        {turnstileSiteKey ? (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js"
              strategy="afterInteractive"
            />
            <div
              className="cf-turnstile"
              data-sitekey={turnstileSiteKey}
              data-action="join"
            />
          </>
        ) : null}
        <FieldError message={state.errors?.turnstile} />
      </fieldset>

      {state.errors?.form ? (
        <p className="form-notice error-notice">{state.errors.form}</p>
      ) : null}
      {state.message ? (
        <p className="form-notice" role="status">
          {state.message}
        </p>
      ) : null}
      <button
        className="button button-primary join-submit"
        type="submit"
        disabled={pending}
      >
        {pending ? "Opening secure checkout…" : "Continue to secure checkout"}
      </button>
      <p className="provider-note">
        Checkout is provided by Dodo Payments. Your listing stays pending until
        payment is verified.
      </p>
    </form>
  );
}
