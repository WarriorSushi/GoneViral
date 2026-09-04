import { randomUUID } from "node:crypto";

import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { readServerEnv } from "@/config/env/server";
import { getAdminSession } from "@/server/admin/auth";
import { hasAdminPermission } from "@/server/admin/permissions";
import { getAdminDashboard } from "@/server/admin/read-model";

import {
  confirmRefundAdminAction,
  moderateAdminAction,
  prepareRefundAdminAction,
  resendManagementAdminAction,
  resumeEmailAdminAction,
  resolveReportAdminAction,
  reviewChangeAdminAction,
  updateFlagAdminAction,
} from "./actions";

export const metadata: Metadata = { title: "Operations" };

const flagGuidance = {
  payments_enabled: {
    label: "Test checkout",
    description:
      "Allows this deployment to create new Dodo checkouts. The provider remains in Test Mode until Live Mode is separately configured and authorized.",
    enabledMeaning: "Synthetic Dodo Test Mode checkout is available.",
    disabledMeaning: "New checkout is safely blocked at the database.",
    enableLabel: "Enable Test Mode checkout",
    disableLabel: "Pause checkout",
  },
  provider_refunds_enabled: {
    label: "Provider refund calls",
    description:
      "Controls whether the audited two-stage refund workflow may call Dodo. It never edits ledger or ranking rows directly.",
    enabledMeaning: "Authorized refund submissions may call Dodo.",
    disabledMeaning: "All provider refund calls remain blocked.",
    enableLabel: "Allow refund calls",
    disableLabel: "Block refund calls",
  },
  read_only: {
    label: "Read-only safety mode",
    description:
      "Emergency brake for business mutations. Turn it on during an incident when new changes must stop while reads remain available.",
    enabledMeaning: "Business mutations are paused for incident safety.",
    disabledMeaning: "Normal authorized business mutations are allowed.",
    enableLabel: "Pause all changes",
    disableLabel: "Resume normal changes",
  },
  outbound_redirects_enabled: {
    label: "Outbound listing links",
    description:
      "Controls whether visitors can leave GoneViral through a listing link after the destination passes the application safety checks.",
    enabledMeaning: "Safe outbound listing links are available.",
    disabledMeaning: "All outbound listing links are paused.",
    enableLabel: "Allow outbound links",
    disableLabel: "Pause outbound links",
  },
} as const;

const flagOrder = [
  "payments_enabled",
  "provider_refunds_enabled",
  "read_only",
  "outbound_redirects_enabled",
] as const;

function ReasonFields({
  help = "This explanation is saved in the immutable admin audit trail.",
  prefix,
}: {
  help?: string;
  prefix: string;
}) {
  const requestId = `${prefix}:${randomUUID()}`;
  const reasonId = `reason-${requestId}`;
  const helpId = `${reasonId}-help`;
  return (
    <>
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor={reasonId}>
        Why are you making this change?
        <input
          aria-describedby={helpId}
          id={reasonId}
          name="reason"
          minLength={8}
          maxLength={1_000}
          placeholder="Write a short, specific reason"
          required
        />
      </label>
      <small className="admin-field-help" id={helpId}>
        {help}
      </small>
    </>
  );
}

function timestamp(value: unknown) {
  return new Date(String(value)).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export default async function AdminPage() {
  await connection();
  const auth = await getAdminSession();
  if (auth.kind === "forbidden") notFound();
  if (auth.kind !== "authenticated") {
    return (
      <main id="main-content" className="public-main admin-page">
        <section className="admin-access-gate" aria-labelledby="access-heading">
          <div className="admin-access-mark" aria-hidden="true">
            <span />
          </div>
          <p className="eyebrow">One private security step</p>
          <h1 id="access-heading">Confirm admin access.</h1>
          <p className="admin-access-lede">
            Enter your admin verification code before opening private controls.
          </p>
          <div className="admin-access-facts">
            <div>
              <strong>This does</strong>
              <span>Confirms access to the private admin area.</span>
            </div>
            <div>
              <strong>This does not</strong>
              <span>Enable payments, change data, or start Live Mode.</span>
            </div>
          </div>
          <div className="admin-access-actions">
            <Link
              className="button button-primary admin-access-primary"
              href="/manage/security?reauth=admin"
            >
              Enter admin code
            </Link>
            <Link className="admin-access-secondary" href="/manage">
              Back to your listings
            </Link>
          </div>
          <small>Keep your verification code private.</small>
        </section>
      </main>
    );
  }
  const { session } = auth;
  const dashboard = await getAdminDashboard(session.role);
  const environment = readServerEnv();
  const flagValues = Object.fromEntries(
    dashboard.flags.map((flag) => [
      String(flag.key),
      (flag.value as { enabled?: unknown }).enabled === true,
    ]),
  ) as Record<string, boolean>;
  const paymentsEnabled = flagValues.payments_enabled === true;
  const refundsEnabled = flagValues.provider_refunds_enabled === true;
  const readOnly = flagValues.read_only === true;
  const deploymentPaymentsEnabled = environment.PAYMENTS_ENABLED === "true";
  const providerMode =
    environment.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
      ? "Dodo Test Mode"
      : environment.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
        ? "Dodo Live Mode"
        : "Local mock mode";
  const issueCount =
    dashboard.paymentExceptions.length +
    dashboard.reconciliation.length +
    dashboard.emails.length;
  const canManageFlags = hasAdminPermission(session.role, "flags:manage");
  return (
    <main id="main-content" className="public-main admin-page">
      <header className="admin-hero">
        <div className="admin-hero-copy">
          <p className="eyebrow">Private founder workspace</p>
          <h1>Operations, without the guesswork.</h1>
          <p className="admin-hero-lede">
            See what is safe, what needs attention, and what each control will
            do before you use it.
          </p>
          <div className="admin-session-line">
            <span className="admin-status-dot" aria-hidden="true" />
            <span>
              Admin session active · {session.role.replace("_", " ")} access
            </span>
          </div>
        </div>
        <aside className="admin-trust-card" aria-label="Admin safety model">
          <p className="eyebrow">Protected by design</p>
          <h2>Every change leaves a receipt.</h2>
          <p>
            Private controls stay locked until access is confirmed. Important
            changes require a reason and are recorded.
          </p>
          <Link href="/manage/security">Review account security</Link>
        </aside>
      </header>

      <nav className="admin-quick-nav" aria-label="Founder console sections">
        <a href="#launch-status">Launch status</a>
        <a href="#controls">Safety controls</a>
        <a href="#work-queues">Work queues</a>
        <a href="#service-health">Service health</a>
      </nav>

      <section
        className="admin-launch-panel"
        id="launch-status"
        aria-labelledby="launch-status-heading"
      >
        <div className="admin-launch-copy">
          <p className="eyebrow">Current pre-launch stage</p>
          <h2 id="launch-status-heading">Test payments, safely fenced</h2>
          <p>
            Production routing is connected, but checkout still needs both the
            deployment switch and the shared database switch. Live payments and
            provider refunds remain outside this test gate.
          </p>
          <ol className="admin-step-list">
            <li data-state="complete">
              <span>1</span>
              <div>
                <strong>Production providers connected</strong>
                <small>
                  Domain, Auth, email, Dodo Test Mode, and scheduler.
                </small>
              </div>
            </li>
            <li data-state={paymentsEnabled ? "complete" : "current"}>
              <span>2</span>
              <div>
                <strong>Allow synthetic checkout</strong>
                <small>
                  {paymentsEnabled
                    ? "The database Test Mode switch is on."
                    : "The database switch is still safely off."}
                </small>
              </div>
            </li>
            <li data-state={paymentsEnabled ? "current" : "pending"}>
              <span>3</span>
              <div>
                <strong>Run one synthetic purchase</strong>
                <small>
                  Then verify webhook, ledger, ranking, and email once.
                </small>
              </div>
            </li>
          </ol>
        </div>
        <div className="admin-status-grid" aria-label="Current runtime status">
          <article>
            <span>Payment provider</span>
            <strong>{providerMode}</strong>
            <small>No real charge in Test Mode</small>
          </article>
          <article>
            <span>Deployment checkout gate</span>
            <strong>{deploymentPaymentsEnabled ? "Ready" : "Off"}</strong>
            <small>Vercel Production setting</small>
          </article>
          <article>
            <span>Database checkout gate</span>
            <strong>{paymentsEnabled ? "Enabled" : "Safely off"}</strong>
            <small>Shared pre-launch data plane</small>
          </article>
          <article>
            <span>Provider refunds</span>
            <strong className={refundsEnabled ? "admin-text-danger" : ""}>
              {refundsEnabled ? "Enabled" : "Blocked"}
            </strong>
            <small>Separate authorization required</small>
          </article>
          <article>
            <span>System write mode</span>
            <strong className={readOnly ? "admin-text-danger" : ""}>
              {readOnly ? "Read-only" : "Normal"}
            </strong>
            <small>Emergency brake status</small>
          </article>
        </div>
      </section>

      <section
        className="admin-section admin-controls-section"
        id="controls"
        aria-labelledby="flags-heading"
      >
        {canManageFlags ? (
          <>
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Guardrails</p>
                <h2 id="flags-heading">Safety controls</h2>
              </div>
              <p>
                These switches affect the shared pre-launch database. Read the
                plain-language effect and change only the control you intend.
              </p>
            </div>
            <div className="admin-control-grid">
              {flagOrder.map((key) => {
                const flag = dashboard.flags.find(
                  (candidate) => String(candidate.key) === key,
                );
                if (!flag) return null;
                const enabled = flagValues[key] === true;
                const guidance = flagGuidance[key];
                const dangerousEnable =
                  key === "provider_refunds_enabled" || key === "read_only";
                return (
                  <form
                    action={updateFlagAdminAction}
                    className="admin-control-card admin-action-form"
                    key={key}
                  >
                    <div className="admin-control-card-header">
                      <div>
                        <p className="admin-control-kicker">System control</p>
                        <h3>{guidance.label}</h3>
                      </div>
                      <span
                        className={`admin-state-pill ${enabled ? "is-on" : "is-off"}`}
                      >
                        {enabled ? "On" : "Off"}
                      </span>
                    </div>
                    <p className="admin-control-effect">
                      {enabled
                        ? guidance.enabledMeaning
                        : guidance.disabledMeaning}
                    </p>
                    <details className="admin-explainer">
                      <summary>What does this control?</summary>
                      <p>{guidance.description}</p>
                    </details>
                    <input type="hidden" name="key" value={key} />
                    <ReasonFields
                      prefix={`flag-${key}`}
                      help="Required for the permanent audit trail. Be specific about the test or incident."
                    />
                    <div className="admin-button-row admin-control-actions">
                      <button
                        className={dangerousEnable ? "danger-button" : ""}
                        disabled={enabled}
                        name="enabled"
                        value="true"
                      >
                        {enabled ? "Currently enabled" : guidance.enableLabel}
                      </button>
                      <button
                        className="secondary-button"
                        disabled={!enabled}
                        name="enabled"
                        value="false"
                      >
                        {enabled ? guidance.disableLabel : "Currently disabled"}
                      </button>
                    </div>
                  </form>
                );
              })}
            </div>
            <p className="admin-safety-note">
              For the current test: enable only <strong>Test checkout</strong>.
              Keep provider refunds blocked, read-only mode off, and outbound
              listing links on.
            </p>
          </>
        ) : (
          <>
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Guardrails</p>
                <h2 id="flags-heading">Safety controls</h2>
              </div>
              <p>
                Your account can review status but cannot change these settings.
              </p>
            </div>
            <div className="admin-access-notice" role="status">
              <p className="eyebrow">View only</p>
              <h3>No controls are available to this admin account.</h3>
              <p>
                You can safely review the current state above. Nothing needs to
                be fixed, and no setting has changed.
              </p>
            </div>
          </>
        )}
      </section>

      <section
        className="admin-section admin-overview-section"
        id="work-queues"
        aria-labelledby="work-queues-heading"
      >
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">At a glance</p>
            <h2 id="work-queues-heading">Work queues</h2>
          </div>
          <p>Open items that may need a human decision.</p>
        </div>
        <div className="admin-metric-grid">
          <article>
            <strong>{dashboard.moderation.length}</strong>
            <span>Moderation items</span>
          </article>
          <article>
            <strong>{dashboard.reports.length}</strong>
            <span>Open reports</span>
          </article>
          <article>
            <strong>{dashboard.changes.length}</strong>
            <span>Listing changes</span>
          </article>
          <article className={issueCount ? "has-attention" : ""}>
            <strong>{issueCount}</strong>
            <span>Service exceptions</span>
          </article>
        </div>
      </section>

      <section className="admin-section" aria-labelledby="moderation-queue">
        <h2 id="moderation-queue">Moderation queue</h2>
        <div className="admin-grid">
          {dashboard.moderation.map((item) => (
            <article className="admin-card" key={String(item.public_id)}>
              <h3>{String(item.name)}</h3>
              <p>
                {String(item.lifecycle_status)} ·{" "}
                {String(item.moderation_status)} · ₹
                {(Number(item.confirmed_total_paise) / 100).toLocaleString(
                  "en-IN",
                )}
              </p>
              <Link href={`/admin/listings/${String(item.public_id)}` as Route}>
                Full redacted context
              </Link>
              <form action={moderateAdminAction} className="admin-action-form">
                <input
                  type="hidden"
                  name="listingPublicId"
                  value={String(item.public_id)}
                />
                <ReasonFields prefix="moderate" />
                <label>
                  Public reason (optional)
                  <input name="publicReason" maxLength={500} />
                </label>
                <div className="admin-button-row">
                  <button name="action" value="clear">
                    Clear
                  </button>
                  <button name="action" value="suspend">
                    Suspend
                  </button>
                  <button name="action" value="unsuspend">
                    Unsuspend
                  </button>
                  {hasAdminPermission(session.role, "listings:remove") ? (
                    <button
                      className="danger-button"
                      name="action"
                      value="remove"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </form>
            </article>
          ))}
        </div>
        {!dashboard.moderation.length ? (
          <p className="quiet-empty">No listings await moderation.</p>
        ) : null}
      </section>

      <section className="admin-section" aria-labelledby="report-queue">
        <h2 id="report-queue">Reports</h2>
        <div className="admin-grid">
          {dashboard.reports.map((report) => (
            <article className="admin-card" key={String(report.public_id)}>
              <h3>{String(report.listing_name)}</h3>
              <p>{String(report.reason_category).replaceAll("_", " ")}</p>
              <p>{String(report.explanation)}</p>
              <small>{timestamp(report.created_at)}</small>
              <form
                action={resolveReportAdminAction}
                className="admin-action-form"
              >
                <input
                  type="hidden"
                  name="reportPublicId"
                  value={String(report.public_id)}
                />
                <ReasonFields prefix="report" />
                <div className="admin-button-row">
                  <button name="resolution" value="resolved">
                    Resolve
                  </button>
                  <button name="resolution" value="dismissed">
                    Dismiss
                  </button>
                </div>
              </form>
            </article>
          ))}
        </div>
        {!dashboard.reports.length ? (
          <p className="quiet-empty">No reports await review.</p>
        ) : null}
      </section>

      <section className="admin-section" aria-labelledby="change-queue">
        <h2 id="change-queue">Sensitive listing changes</h2>
        <div className="admin-grid">
          {dashboard.changes.map((change) => (
            <article className="admin-card" key={String(change.id)}>
              <h3>{String(change.listing_name)}</h3>
              <p>{String(change.change_type)}</p>
              <pre>{JSON.stringify(change.proposed_value, null, 2)}</pre>
              <form
                action={reviewChangeAdminAction}
                className="admin-action-form"
              >
                <input
                  type="hidden"
                  name="changeRequestId"
                  value={String(change.id)}
                />
                <ReasonFields prefix="change" />
                {hasAdminPermission(session.role, "requests:reassign") ? (
                  <label className="check-row">
                    <input
                      type="checkbox"
                      name="allowReassignment"
                      value="yes"
                    />
                    Release a removed conflicting destination with evidence
                  </label>
                ) : null}
                <div className="admin-button-row">
                  <button name="decision" value="approved">
                    Approve
                  </button>
                  <button name="decision" value="rejected">
                    Reject
                  </button>
                </div>
              </form>
            </article>
          ))}
        </div>
        {!dashboard.changes.length ? (
          <p className="quiet-empty">No sensitive changes await review.</p>
        ) : null}
      </section>

      <section
        className="admin-section"
        id="service-health"
        aria-labelledby="exceptions-queue"
      >
        <h2 id="exceptions-queue">Payment and reconciliation exceptions</h2>
        <div className="admin-grid">
          {dashboard.paymentExceptions.map((item) => (
            <article className="admin-card" key={String(item.id)}>
              <h3>
                {String(item.semantic_error_code ?? "Payment quarantine")}
              </h3>
              <p>{String(item.provider_event_type)}</p>
              <code>{String(item.provider_payment_id ?? "[redacted]")}</code>
            </article>
          ))}
          {dashboard.reconciliation.map((item) => (
            <article className="admin-card" key={String(item.id)}>
              <h3>{String(item.discrepancy_type)}</h3>
              <p>Listing {String(item.listing_public_id ?? "unlinked")}</p>
              <code>{String(item.provider_object_id)}</code>
            </article>
          ))}
          {dashboard.emails.map((item) => (
            <article className="admin-card" key={String(item.id)}>
              <h3>{String(item.kind)} email</h3>
              <p>
                {String(item.state)} · attempt {String(item.attempt_count)}
              </p>
              <p>Delivery: {String(item.delivery_state)}</p>
              <code>
                Provider reference:{" "}
                {String(item.provider_message_id ?? "not accepted")}
              </code>
              <code>{String(item.last_error_code ?? "no error code")}</code>
              {hasAdminPermission(session.role, "safe_email:resend") &&
              ["dead_letter", "failed_retryable"].includes(
                String(item.state),
              ) &&
              !item.provider_message_id ? (
                <form
                  action={resumeEmailAdminAction}
                  className="admin-action-form"
                >
                  <input
                    type="hidden"
                    name="emailOutboxId"
                    value={String(item.id)}
                  />
                  <ReasonFields prefix="email-resume" />
                  <button type="submit">Resume unsent email</button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section" aria-labelledby="abuse-heading">
        <h2 id="abuse-heading">Abuse signals</h2>
        <p>
          Aggregate active rate-limit buckets only. Subject fingerprints stay
          private and are not shown here.
        </p>
        <div className="admin-grid">
          {dashboard.abuse.length === 0 ? (
            <p>No active rate-limit buckets.</p>
          ) : (
            dashboard.abuse.map((item) => (
              <article className="admin-card" key={String(item.scope)}>
                <h3>{String(item.scope).replaceAll("_", " ")}</h3>
                <p>
                  {String(item.observed_count)} observed actions across{" "}
                  {String(item.active_buckets)} active buckets.
                </p>
                <p>Latest expiry: {String(item.latest_expiry)}</p>
              </article>
            ))
          )}
        </div>
      </section>

      {hasAdminPermission(session.role, "payments:refund") ? (
        <section className="admin-section" aria-labelledby="refund-heading">
          <h2 id="refund-heading">Two-stage provider refunds</h2>
          <p>
            Disabled by default. Submission asks Dodo for a refund; rank changes
            only after an effective signed Dodo event.
          </p>
          <form
            action={prepareRefundAdminAction}
            className="admin-card admin-action-form"
          >
            <h3>Prepare request</h3>
            <label>
              Provider payment ID
              <input name="providerPaymentId" required />
            </label>
            <label>
              Amount in paise
              <input name="amountPaise" inputMode="numeric" required />
            </label>
            <ReasonFields prefix="refund-prepare" />
            <button type="submit">Prepare only</button>
          </form>
          <div className="admin-grid">
            {dashboard.refunds.map((refund) => (
              <article className="admin-card" key={String(refund.public_id)}>
                <h3>{String(refund.public_id)}</h3>
                <p>
                  {String(refund.state)} · ₹
                  {(Number(refund.amount_paise) / 100).toLocaleString("en-IN")}
                </p>
                <code>{String(refund.provider_payment_id)}</code>
                {new Set(["prepared", "failed"]).has(String(refund.state)) ? (
                  <form
                    action={confirmRefundAdminAction}
                    className="admin-action-form"
                  >
                    <input
                      type="hidden"
                      name="refundPublicId"
                      value={String(refund.public_id)}
                    />
                    <ReasonFields prefix="refund-confirm" />
                    <button className="danger-button" type="submit">
                      Confirm provider call
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="admin-section" aria-labelledby="safe-email-heading">
        <h2 id="safe-email-heading">Safe management resend</h2>
        <form
          action={resendManagementAdminAction}
          className="admin-card admin-action-form"
        >
          <label>
            Listing public ID
            <input name="listingPublicId" required />
          </label>
          <ReasonFields prefix="management-email" />
          <button type="submit">Queue safe email</button>
        </form>
      </section>
    </main>
  );
}
