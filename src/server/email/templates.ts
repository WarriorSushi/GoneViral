import "server-only";

import { z } from "zod";

import { formatInr, moneyPaise } from "@/domain/money";

export const EMAIL_TEMPLATE_VERSION = "2026-08-30-v2";
const LEGACY_EMAIL_TEMPLATE_VERSION = "2026-08-29-v1";
const BRAND_LOGO_URL =
  "https://fndssapjkaicxzeruuvv.supabase.co/storage/v1/object/public/goneviral-logo-public/brand/goneviral-email-logo.webp";

export type EmailTemplateKind =
  | "change_request_result"
  | "management_link_requested"
  | "moderation_result"
  | "raise_confirmed"
  | "sponsorship_adjusted"
  | "sponsorship_confirmed_claim"
  | "verification_delay";

export type RenderedEmail = Readonly<{
  html: string;
  subject: string;
  text: string;
}>;

const publicId = z
  .string()
  .min(4)
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/);
const listingName = z.string().min(1).max(160);
const amount = z.string().regex(/^-?[0-9]+$/);

const payloadSchemas = {
  sponsorship_confirmed_claim: z.object({
    amountPaise: amount,
    attemptPublicId: publicId,
    listingName,
    listingPublicId: publicId,
  }),
  raise_confirmed: z.object({
    amountPaise: amount,
    attemptPublicId: publicId,
    listingName,
    listingPublicId: publicId,
  }),
  sponsorship_adjusted: z.object({
    amountDeltaPaise: amount,
    entryType: z.enum([
      "refund",
      "chargeback",
      "refund_restoration",
      "chargeback_restoration",
    ]),
    listingName,
    listingPublicId: publicId,
  }),
  management_link_requested: z.object({
    listingName,
    listingPublicId: publicId,
  }),
  moderation_result: z.object({
    listingName,
    listingPublicId: publicId,
    outcome: z.enum(["clear", "removed", "suspended", "unsuspended"]),
    publicReason: z.string().max(500).optional(),
  }),
  change_request_result: z.object({
    changeType: z.enum(["category", "destination", "name", "tagline"]),
    listingName,
    listingPublicId: publicId,
    outcome: z.enum(["approved", "rejected"]),
  }),
  verification_delay: z.object({
    attemptPublicId: publicId,
    listingName,
    listingPublicId: publicId,
  }),
} as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "'":
        return "&#39;";
      default:
        return "&quot;";
    }
  });
}

function subjectText(value: string): string {
  return value.replace(/[\r\n\u0000-\u001f\u007f]/g, " ").trim();
}

function safeUrl(siteUrl: string, path: string): string {
  const base = new URL(siteUrl);
  return new URL(path, base.origin).toString();
}

function frame(input: {
  actionLabel: string;
  actionUrl: string;
  body: string;
  heading: string;
  supportReference: string;
}): { html: string; textSuffix: string } {
  const actionUrl = escapeHtml(input.actionUrl);
  const supportReference = escapeHtml(input.supportReference);
  return {
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f5f2ec;color:#1c1917;font-family:Arial,sans-serif}.email-copy p{margin:0 0 14px;color:#5f5952;font-size:16px;line-height:1.65}.email-copy strong{color:#1c1917}@media(max-width:620px){.email-shell{padding:18px 10px!important}.email-card{padding:28px 22px!important}.email-heading{font-size:30px!important}}</style></head><body><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f2ec"><tr><td class="email-shell" align="center" style="padding:36px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px"><tr><td style="padding:0 0 14px;text-align:center"><img src="${BRAND_LOGO_URL}" width="52" height="52" alt="GoneViral.in" style="display:inline-block;width:52px;height:52px;border:0;border-radius:50%"><div style="margin-top:8px;color:#1c1917;font-size:18px;font-weight:800;letter-spacing:-.5px">Gone<span style="color:#9f2d36">Viral</span>.in</div></td></tr><tr><td class="email-card" style="padding:42px 44px;border:1px solid #e2dbd1;border-radius:24px;background:#fff;box-shadow:0 12px 32px rgba(55,41,31,.08)"><div style="margin-bottom:12px;color:#9f2d36;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">A GoneViral update</div><h1 class="email-heading" style="margin:0 0 18px;color:#1c1917;font-size:38px;line-height:1.08;letter-spacing:-1.6px">${escapeHtml(input.heading)}</h1><div class="email-copy">${input.body}</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 24px"><tr><td style="border-radius:999px;background:#9f2d36"><a href="${actionUrl}" style="display:inline-block;padding:14px 22px;color:#fff;font-size:16px;font-weight:800;text-decoration:none">${escapeHtml(input.actionLabel)}</a></td></tr></table><div style="padding-top:20px;border-top:1px solid #e8e3db;color:#766f67;font-size:12px;line-height:1.55"><div>Support reference: <span style="color:#1c1917">${supportReference}</span></div><div style="margin-top:7px">Your position changes only after a payment is confirmed. An email can never change the leaderboard.</div></div></td></tr><tr><td style="padding:18px 24px 0;color:#8a837b;font-size:11px;line-height:1.5;text-align:center">You received this service email because someone used this address for a GoneViral listing or management request.</td></tr></table></td></tr></table></body></html>`,
    textSuffix: `\n\n${input.actionLabel}: ${input.actionUrl}\nSupport reference: ${input.supportReference}\nYour position changes only after a payment is confirmed. An email can never change the leaderboard.`,
  };
}

export function renderEmailTemplate(input: {
  kind: EmailTemplateKind;
  payload: unknown;
  siteUrl: string;
  templateVersion: string;
}): RenderedEmail {
  if (
    input.templateVersion !== EMAIL_TEMPLATE_VERSION &&
    input.templateVersion !== LEGACY_EMAIL_TEMPLATE_VERSION
  ) {
    throw new Error("email_template_version_unsupported");
  }

  switch (input.kind) {
    case "sponsorship_confirmed_claim": {
      const payload = payloadSchemas.sponsorship_confirmed_claim.parse(
        input.payload,
      );
      const value = formatInr(moneyPaise(BigInt(payload.amountPaise)));
      const frameValue = frame({
        actionLabel: "View confirmed result",
        actionUrl: safeUrl(
          input.siteUrl,
          `/join/${encodeURIComponent(payload.attemptPublicId)}/confirmed`,
        ),
        body: `<p><strong>${escapeHtml(value)}</strong> was confirmed for <strong>${escapeHtml(payload.listingName)}</strong>.</p><p>Your listing is now reflected on the leaderboard. Open the result below, then use the Manage page whenever you need a secure, one-time sign-in link.</p>`,
        heading: "Your sponsorship is confirmed",
        supportReference: payload.attemptPublicId,
      });
      return {
        html: frameValue.html,
        subject: subjectText(`${payload.listingName} is confirmed`),
        text: `${value} was confirmed for ${payload.listingName}. Your listing is now reflected on the leaderboard. Use the Manage page whenever you need a secure, one-time sign-in link.${frameValue.textSuffix}`,
      };
    }
    case "raise_confirmed": {
      const payload = payloadSchemas.raise_confirmed.parse(input.payload);
      const value = formatInr(moneyPaise(BigInt(payload.amountPaise)));
      const frameValue = frame({
        actionLabel: "Manage listing",
        actionUrl: safeUrl(input.siteUrl, "/manage"),
        body: `<p><strong>${escapeHtml(value)}</strong> was added to <strong>${escapeHtml(payload.listingName)}</strong>.</p><p>The leaderboard now reflects the confirmed payment. Open your listing to see its current position.</p>`,
        heading: "Your raise is confirmed",
        supportReference: payload.attemptPublicId,
      });
      return {
        html: frameValue.html,
        subject: subjectText(`${payload.listingName} raise confirmed`),
        text: `${value} was added to ${payload.listingName} after provider confirmation.${frameValue.textSuffix}`,
      };
    }
    case "sponsorship_adjusted": {
      const payload = payloadSchemas.sponsorship_adjusted.parse(input.payload);
      const delta = BigInt(payload.amountDeltaPaise);
      const value = formatInr(moneyPaise(delta < 0n ? -delta : delta));
      const direction = delta < 0n ? "removed from" : "restored to";
      const frameValue = frame({
        actionLabel: "Manage listing",
        actionUrl: safeUrl(input.siteUrl, "/manage"),
        body: `<p><strong>${escapeHtml(value)}</strong> was ${direction} <strong>${escapeHtml(payload.listingName)}</strong> after the payment total changed.</p><p>The leaderboard has been recalculated from the confirmed amount.</p>`,
        heading: "Your sponsorship total changed",
        supportReference: payload.listingPublicId,
      });
      return {
        html: frameValue.html,
        subject: subjectText(`${payload.listingName} sponsorship update`),
        text: `${value} was ${direction} ${payload.listingName} after a confirmed payment adjustment.${frameValue.textSuffix}`,
      };
    }
    case "management_link_requested": {
      const payload = payloadSchemas.management_link_requested.parse(
        input.payload,
      );
      const frameValue = frame({
        actionLabel: "Request secure management link",
        actionUrl: safeUrl(input.siteUrl, "/manage"),
        body: `<p>Someone asked to manage <strong>${escapeHtml(payload.listingName)}</strong>.</p><p>Open the Manage page and enter the listing email. If it matches, we’ll send a separate one-time sign-in link. The link expires and can only be used once.</p>`,
        heading: "Manage your listing securely",
        supportReference: payload.listingPublicId,
      });
      return {
        html: frameValue.html,
        subject: subjectText(`Manage ${payload.listingName} securely`),
        text: `Someone asked to manage ${payload.listingName}. Open the Manage page and enter the listing email. If it matches, we will send a separate one-time sign-in link.${frameValue.textSuffix}`,
      };
    }
    case "moderation_result": {
      const payload = payloadSchemas.moderation_result.parse(input.payload);
      const reason = payload.publicReason
        ? `<p>Public reason: ${escapeHtml(payload.publicReason)}</p>`
        : "";
      const frameValue = frame({
        actionLabel: "Open management",
        actionUrl: safeUrl(input.siteUrl, "/manage"),
        body: `<p>The review status for <strong>${escapeHtml(payload.listingName)}</strong> is now <strong>${escapeHtml(payload.outcome)}</strong>.</p>${reason}`,
        heading: "Listing moderation update",
        supportReference: payload.listingPublicId,
      });
      return {
        html: frameValue.html,
        subject: subjectText(`${payload.listingName} moderation update`),
        text: `The moderation state for ${payload.listingName} is now ${payload.outcome}.${payload.publicReason ? ` Public reason: ${payload.publicReason}` : ""}${frameValue.textSuffix}`,
      };
    }
    case "change_request_result": {
      const payload = payloadSchemas.change_request_result.parse(input.payload);
      const frameValue = frame({
        actionLabel: "Open management",
        actionUrl: safeUrl(input.siteUrl, "/manage"),
        body: `<p>Your request to change the <strong>${escapeHtml(payload.changeType)}</strong> for <strong>${escapeHtml(payload.listingName)}</strong> was <strong>${escapeHtml(payload.outcome)}</strong>.</p>`,
        heading: "Listing change review complete",
        supportReference: payload.listingPublicId,
      });
      return {
        html: frameValue.html,
        subject: subjectText(`${payload.listingName} change review complete`),
        text: `The ${payload.changeType} change for ${payload.listingName} was ${payload.outcome}.${frameValue.textSuffix}`,
      };
    }
    case "verification_delay": {
      const payload = payloadSchemas.verification_delay.parse(input.payload);
      const frameValue = frame({
        actionLabel: "Check payment status",
        actionUrl: safeUrl(
          input.siteUrl,
          `/join/${encodeURIComponent(payload.attemptPublicId)}/pending`,
        ),
        body: `<p>We’re still checking the payment for <strong>${escapeHtml(payload.listingName)}</strong>.</p><p>Nothing has been added to the leaderboard yet. You do not need to pay again while this check is in progress.</p>`,
        heading: "Payment verification is taking longer",
        supportReference: payload.attemptPublicId,
      });
      return {
        html: frameValue.html,
        subject: subjectText(`Still verifying ${payload.listingName}`),
        text: `We are still verifying the payment for ${payload.listingName}. The leaderboard has not been changed by this pending checkout.${frameValue.textSuffix}`,
      };
    }
  }

  throw new Error("email_template_kind_unsupported");
}
