"use client";

import Link from "next/link";
import Script from "next/script";
import { useActionState, useState } from "react";

import {
  LogoCropField,
  type LogoCropStatus,
} from "@/components/shared/logo-crop-field";
import type { PublicCategory } from "@/server/db/repositories/public-types";

import { submitJoinForm, type JoinActionState } from "@/app/join/actions";

const initialState: JoinActionState = {};

function FieldError({
  field,
  message,
}: {
  field: string;
  message: string | undefined;
}) {
  return message ? (
    <p className="field-error" id={`${field}-error`} role="alert">
      {message}
    </p>
  ) : null;
}

export function JoinForm({
  categories,
  idempotencyKey,
  localTurnstileToken,
  turnstileSiteKey,
  initialAmountRupees = "499",
  takeoverTarget,
}: {
  categories: PublicCategory[];
  idempotencyKey: string;
  localTurnstileToken: string | undefined;
  turnstileSiteKey: string | undefined;
  initialAmountRupees?: string;
  takeoverTarget?: Readonly<{ name: string; rank: string; slug: string }>;
}) {
  const [state, action, pending] = useActionState(submitJoinForm, initialState);
  const [logoStatus, setLogoStatus] = useState<LogoCropStatus>("empty");

  return (
    <form action={action} className="join-form" noValidate>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input
        type="hidden"
        name="targetSlug"
        value={takeoverTarget?.slug ?? ""}
      />
      {takeoverTarget ? (
        <p className="form-notice">
          Current quote to exceed #{takeoverTarget.rank} ({takeoverTarget.name})
          by ₹1: <strong>₹{initialAmountRupees}</strong>. The position is not
          reserved.
        </p>
      ) : null}
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
              aria-describedby={state.errors?.name ? "name-error" : undefined}
              aria-invalid={Boolean(state.errors?.name)}
              name="name"
              maxLength={160}
              autoComplete="organization"
              required
            />
            <FieldError field="name" message={state.errors?.name} />
          </label>
          <label>
            Category
            <select
              aria-describedby={
                state.errors?.category ? "category-error" : undefined
              }
              aria-invalid={Boolean(state.errors?.category)}
              name="category"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Choose one
              </option>
              {categories.map((category) => (
                <option value={category.slug} key={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError field="category" message={state.errors?.category} />
          </label>
          <label className="form-wide">
            Tagline
            <input
              aria-describedby={
                state.errors?.tagline ? "tagline-error" : undefined
              }
              aria-invalid={Boolean(state.errors?.tagline)}
              name="tagline"
              maxLength={320}
              required
            />
            <FieldError field="tagline" message={state.errors?.tagline} />
          </label>
          <label className="form-wide">
            Website URL
            <input
              aria-describedby={
                state.errors?.destination ? "destination-error" : undefined
              }
              aria-invalid={Boolean(state.errors?.destination)}
              name="destination"
              type="url"
              inputMode="url"
              placeholder="https://example.com"
              required
            />
            <FieldError
              field="destination"
              message={state.errors?.destination}
            />
          </label>
          <div className="form-wide">
            <LogoCropField
              ariaInvalid={Boolean(state.errors?.logo)}
              disabled={pending}
              helpId="logo-help"
              label="Logo (optional)"
              name="logo"
              onStatusChange={setLogoStatus}
            />
            <span className="field-help" id="logo-help">
              JPEG, PNG or WebP, up to 2 MB. Crop it into the square, then we
              clean and resize it before it appears publicly. It is discarded if
              payment is not confirmed.
            </span>
            <FieldError field="logo" message={state.errors?.logo} />
          </div>
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
            <input
              aria-describedby={state.errors?.email ? "email-error" : undefined}
              aria-invalid={Boolean(state.errors?.email)}
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <FieldError field="email" message={state.errors?.email} />
          </label>
          <label>
            Phone
            <input
              aria-describedby={state.errors?.phone ? "phone-error" : undefined}
              aria-invalid={Boolean(state.errors?.phone)}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+919876543210"
              required
            />
            <FieldError field="phone" message={state.errors?.phone} />
          </label>
          <label className="amount-field">
            Amount (₹)
            <input
              aria-describedby={
                state.errors?.amount ? "amount-error" : undefined
              }
              aria-invalid={Boolean(state.errors?.amount)}
              name="amount"
              type="number"
              inputMode="numeric"
              min={initialAmountRupees}
              max="21474836"
              step="1"
              defaultValue={initialAmountRupees}
              required
            />
            <FieldError field="amount" message={state.errors?.amount} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>
          <span>3</span> Review
        </legend>
        <p className="field-help">
          Payment buys leaderboard placement. It does not promise clicks, sales,
          or a permanent rank. Read how money decides the order in the{" "}
          <Link href="/paid-placement">paid placement disclosure</Link>.
        </p>
        <label className="check-row">
          <input
            aria-describedby={state.errors?.terms ? "terms-error" : undefined}
            aria-invalid={Boolean(state.errors?.terms)}
            name="termsAccepted"
            type="checkbox"
            value="yes"
            required
          />
          <span>
            I accept the <Link href="/terms">terms</Link>,{" "}
            <Link href="/privacy">privacy policy</Link>,{" "}
            <Link href="/refunds">refund policy</Link>, and{" "}
            <Link href="/content-policy">content policy</Link>.
          </span>
        </label>
        <FieldError field="terms" message={state.errors?.terms} />
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
        <FieldError field="turnstile" message={state.errors?.turnstile} />
      </fieldset>

      {state.errors?.form ? (
        <p className="form-notice error-notice" role="alert">
          {state.errors.form}
        </p>
      ) : null}
      {state.message ? (
        <p className="form-notice error-notice" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        className="button button-primary join-submit"
        type="submit"
        disabled={pending || logoStatus === "editing"}
      >
        {pending
          ? "Opening secure checkout…"
          : logoStatus === "editing"
            ? "Finish the logo crop first"
            : "Continue to secure checkout"}
      </button>
      <p className="provider-note">
        Dodo Payments provides checkout, acts as merchant of record for the
        customer transaction, and supplies its invoice. Your listing stays
        pending until payment is verified.{" "}
        <Link href="/contact">Contact or report abuse</Link>.
      </p>
    </form>
  );
}
