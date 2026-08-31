"use client";

import Link from "next/link";
import Script from "next/script";
import { useActionState } from "react";

import { REPORT_REASON_LABELS, REPORT_REASONS } from "@/domain/report";
import {
  submitReportAction,
  type ReportActionState,
} from "@/app/l/[slug]/report/actions";

export function ReportForm({
  localTurnstileToken,
  slug,
  turnstileSiteKey,
}: {
  localTurnstileToken: string | undefined;
  slug: string;
  turnstileSiteKey: string | undefined;
}) {
  const action = submitReportAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<
    ReportActionState,
    FormData
  >(action, {});
  return (
    <form action={formAction} className="join-form" noValidate>
      {localTurnstileToken ? (
        <input
          type="hidden"
          name="turnstileToken"
          value={localTurnstileToken}
        />
      ) : null}
      <fieldset disabled={state.complete}>
        <legend>What should we review?</legend>
        <label>
          Reason
          <select name="reason" defaultValue="" required>
            <option value="" disabled>
              Choose one
            </option>
            {REPORT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {REPORT_REASON_LABELS[reason]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Details
          <textarea
            name="explanation"
            minLength={20}
            maxLength={2_000}
            rows={7}
            required
          />
        </label>
        <label>
          Email (optional)
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={320}
          />
          <span className="field-help">
            Private. Only used if we need evidence.
          </span>
        </label>
        {turnstileSiteKey ? (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js"
              strategy="afterInteractive"
            />
            <div
              className="cf-turnstile"
              data-sitekey={turnstileSiteKey}
              data-action="report"
            />
          </>
        ) : null}
      </fieldset>
      {state.message ? (
        <p
          className={`form-notice ${state.complete ? "success-notice" : "error-notice"}`}
          role={state.complete ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
      <button
        className="button button-primary"
        type="submit"
        disabled={pending || state.complete}
      >
        {pending
          ? "Sending…"
          : state.complete
            ? "Report received"
            : "Send report"}
      </button>
      <p className="provider-note">
        Read the <Link href="/content-policy">content policy</Link> and{" "}
        <Link href="/privacy">privacy policy</Link>, or use the{" "}
        <Link href="/contact">contact / abuse hook</Link>.
      </p>
    </form>
  );
}
