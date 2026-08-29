import { randomUUID } from "node:crypto";

import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { getAdminSession } from "@/server/admin/auth";
import { hasAdminPermission } from "@/server/admin/permissions";
import { getAdminDashboard } from "@/server/admin/read-model";

import {
  confirmRefundAdminAction,
  moderateAdminAction,
  prepareRefundAdminAction,
  resendManagementAdminAction,
  resolveReportAdminAction,
  reviewChangeAdminAction,
  updateFlagAdminAction,
} from "./actions";

export const metadata: Metadata = { title: "Operations" };

function ReasonFields({ prefix }: { prefix: string }) {
  return (
    <>
      <input
        type="hidden"
        name="requestId"
        value={`${prefix}:${randomUUID()}`}
      />
      <label>
        Operational reason
        <input name="reason" minLength={8} maxLength={1_000} required />
      </label>
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
        <section className="join-heading">
          <p className="eyebrow">Restricted operations</p>
          <h1>Admin verification required</h1>
          <p>
            Use an allowlisted Supabase account with a verified MFA factor. A
            fresh AAL2 session is required before administrative data or actions
            are available.
          </p>
          <Link href="/manage">Return to account access</Link>
        </section>
      </main>
    );
  }
  const { session } = auth;
  const dashboard = await getAdminDashboard(session.role);
  return (
    <main id="main-content" className="public-main admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Restricted operations</p>
          <h1>Founder console</h1>
          <p>
            Signed in as {session.email} · {session.role.replace("_", " ")}
          </p>
        </div>
        <p className="form-notice">
          Every mutation needs a reason, fresh MFA, and an immutable audit row.
          Moderation never edits money.
        </p>
      </header>

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

      <section className="admin-section" aria-labelledby="exceptions-queue">
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
              <code>{String(item.last_error_code ?? "no error code")}</code>
            </article>
          ))}
        </div>
      </section>

      {hasAdminPermission(session.role, "flags:manage") ? (
        <section className="admin-section" aria-labelledby="flags-heading">
          <h2 id="flags-heading">Emergency controls</h2>
          <div className="admin-grid">
            {dashboard.flags.map((flag) => (
              <form
                action={updateFlagAdminAction}
                className="admin-card admin-action-form"
                key={String(flag.key)}
              >
                <h3>{String(flag.key).replaceAll("_", " ")}</h3>
                <p>
                  Current:{" "}
                  {String((flag.value as { enabled?: unknown }).enabled)}
                </p>
                <input type="hidden" name="key" value={String(flag.key)} />
                <ReasonFields prefix="flag" />
                <div className="admin-button-row">
                  <button name="enabled" value="true">
                    Enable
                  </button>
                  <button name="enabled" value="false">
                    Disable
                  </button>
                </div>
              </form>
            ))}
          </div>
        </section>
      ) : null}

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
