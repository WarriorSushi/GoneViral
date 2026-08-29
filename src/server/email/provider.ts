import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import { readServerEnv } from "@/config/env/server";

export type EmailMessage = Readonly<{
  html: string;
  subject: string;
  text: string;
  to: string;
}>;

export type EmailSendResult = Readonly<{ providerMessageId: string }>;

export interface EmailDeliveryProvider {
  send(input: {
    idempotencyKey: string;
    message: EmailMessage;
  }): Promise<EmailSendResult>;
}

export class EmailProviderError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "EmailProviderError";
  }
}

export class MockEmailProvider implements EmailDeliveryProvider {
  async send(input: {
    idempotencyKey: string;
    message: EmailMessage;
  }): Promise<EmailSendResult> {
    void input.message;
    return {
      providerMessageId: `mock_email_${createHash("sha256")
        .update(input.idempotencyKey)
        .digest("hex")
        .slice(0, 24)}`,
    };
  }
}

const resendResponseSchema = z.object({ id: z.string().min(1).max(200) });
const resendErrorSchema = z.object({ name: z.string().max(100).optional() });

export class ResendEmailProvider implements EmailDeliveryProvider {
  constructor(
    private readonly configuration: {
      apiKey: string;
      fetchImplementation?: typeof fetch;
      from: string;
      replyTo?: string;
    },
  ) {}

  async send(input: {
    idempotencyKey: string;
    message: EmailMessage;
  }): Promise<EmailSendResult> {
    const fetchImplementation = this.configuration.fetchImplementation ?? fetch;
    let response: Response;
    try {
      response = await fetchImplementation("https://api.resend.com/emails", {
        body: JSON.stringify({
          from: this.configuration.from,
          html: input.message.html,
          ...(this.configuration.replyTo
            ? { reply_to: this.configuration.replyTo }
            : {}),
          subject: input.message.subject,
          text: input.message.text,
          to: [input.message.to],
        }),
        headers: {
          Authorization: `Bearer ${this.configuration.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        method: "POST",
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new EmailProviderError("resend_network_error", true);
    }

    const body: unknown = await response.json().catch(() => ({}));
    if (response.ok) {
      const parsed = resendResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new EmailProviderError("resend_response_invalid", true);
      }
      return { providerMessageId: parsed.data.id };
    }

    const providerName = resendErrorSchema.safeParse(body).success
      ? resendErrorSchema.parse(body).name
      : undefined;
    const safeName = providerName?.replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
    const code = `resend_${response.status}${safeName ? `_${safeName}` : ""}`;
    const retryable =
      response.status === 429 ||
      response.status >= 500 ||
      (response.status === 409 &&
        safeName === "concurrent_idempotent_requests");
    throw new EmailProviderError(code.slice(0, 180), retryable);
  }
}

export function getEmailDeliveryProvider(): EmailDeliveryProvider {
  const environment = readServerEnv();
  if (environment.EMAIL_DELIVERY_MODE === "mock") {
    if (environment.NODE_ENV === "production") {
      throw new Error("email_mock_forbidden_in_production");
    }
    return new MockEmailProvider();
  }
  return new ResendEmailProvider({
    apiKey: environment.RESEND_API_KEY!,
    from: environment.RESEND_FROM_EMAIL!,
    ...(environment.RESEND_REPLY_TO
      ? { replyTo: environment.RESEND_REPLY_TO }
      : {}),
  });
}
