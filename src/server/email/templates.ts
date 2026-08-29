import "server-only";

import { z } from "zod";

import { formatInr, moneyPaise } from "@/domain/money";

export const EMAIL_TEMPLATE_VERSION = "2026-08-29-v1";

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
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#17120d"><main><p style="color:#715cff;font-weight:700">GoneViral.in</p><h1>${escapeHtml(input.heading)}</h1>${input.body}<p><a href="${actionUrl}">${escapeHtml(input.actionLabel)}</a></p><p style="color:#665f58;font-size:13px">Support reference: ${supportReference}</p><p style="color:#665f58;font-size:13px">Sponsored leaderboard placement. Rank changes only from confirmed ledger entries, never from email.</p></main></body></html>`,
    textSuffix: `\n\n${input.actionLabel}: ${input.actionUrl}\nSupport reference: ${input.supportReference}\nSponsored leaderboard placement. Email never changes rank.`,
  };
}

export function renderEmailTemplate(input: {
  kind: EmailTemplateKind;
  payload: unknown;
  siteUrl: string;
  templateVersion: string;
}): RenderedEmail {
  if (input.templateVersion !== EMAIL_TEMPLATE_VERSION) {
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
        body: `<p>${escapeHtml(value)} was confirmed for ${escapeHtml(payload.listingName)}.</p><p>Use the management page to request a secure Supabase Auth link. The email itself contains no ownership token.</p>`,
        heading: "Your sponsorship is confirmed",
        supportReference: payload.attemptPublicId,
      });
      return {
        html: frameValue.html,
        subject: subjectText(`${payload.listingName} is confirmed`),
        text: `${value} was confirmed for ${payload.listingName}. Use the management page to request a secure Supabase Auth link.${frameValue.textSuffix}`,
      };
    }
    case "raise_confirmed": {
      const payload = payloadSchemas.raise_confirmed.parse(input.payload);
      const value = formatInr(moneyPaise(BigInt(payload.amountPaise)));
      const frameValue = frame({
        actionLabel: "Manage listing",
        actionUrl: safeUrl(input.siteUrl, "/manage"),
        body: `<p>${escapeHtml(value)} was added to ${escapeHtml(payload.listingName)} after provider confirmation.</p>`,
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
        body: `<p>${escapeHtml(value)} was ${direction} ${escapeHtml(payload.listingName)} after a confirmed payment adjustment.</p>`,
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
        body: `<p>A secure management-link prompt was requested for ${escapeHtml(payload.listingName)}. Supabase Auth creates and sends the one-time link after the generic request form is submitted.</p>`,
        heading: "Manage your listing securely",
        supportReference: payload.listingPublicId,
      });
      return {
        html: frameValue.html,
        subject: subjectText(`Manage ${payload.listingName} securely`),
        text: `A secure management-link prompt was requested for ${payload.listingName}. Supabase Auth sends the one-time link after the generic request form is submitted.${frameValue.textSuffix}`,
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
        body: `<p>The moderation state for ${escapeHtml(payload.listingName)} is now ${escapeHtml(payload.outcome)}.</p>${reason}`,
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
        body: `<p>The ${escapeHtml(payload.changeType)} change for ${escapeHtml(payload.listingName)} was ${escapeHtml(payload.outcome)}.</p>`,
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
        body: `<p>We are still verifying the payment for ${escapeHtml(payload.listingName)} directly with the payment provider. The leaderboard has not been changed by this pending checkout.</p>`,
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
