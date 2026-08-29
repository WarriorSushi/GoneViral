import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  EmailProviderError,
  MockEmailProvider,
  ResendEmailProvider,
} from "@/server/email/provider";

const message = {
  html: "<p>Safe</p>",
  subject: "Safe subject",
  text: "Safe",
  to: "owner@example.com",
};

describe("email delivery provider boundary", () => {
  it("sends a deterministic payload with the stable Resend idempotency header", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      Response.json({ id: "resend-message-123" }),
    );
    const provider = new ResendEmailProvider({
      apiKey: "resend-test-secret",
      fetchImplementation,
      from: "GoneViral <updates@goneviral.in>",
      replyTo: "support@goneviral.in",
    });
    await expect(
      provider.send({ idempotencyKey: "goneviral-email/row-1", message }),
    ).resolves.toEqual({ providerMessageId: "resend-message-123" });
    const [, init] = fetchImplementation.mock.calls[0]!;
    expect(new Headers(init?.headers).get("idempotency-key")).toBe(
      "goneviral-email/row-1",
    );
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer resend-test-secret",
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      from: "GoneViral <updates@goneviral.in>",
      html: "<p>Safe</p>",
      reply_to: "support@goneviral.in",
      subject: "Safe subject",
      text: "Safe",
      to: ["owner@example.com"],
    });
  });

  it("classifies rate limits as retryable and invalid requests as permanent", async () => {
    for (const [status, retryable] of [
      [429, true],
      [422, false],
    ] as const) {
      const provider = new ResendEmailProvider({
        apiKey: "secret",
        fetchImplementation: vi.fn<typeof fetch>(async () =>
          Response.json({ name: "validation_error" }, { status }),
        ),
        from: "updates@goneviral.in",
      });
      const error = await provider
        .send({ idempotencyKey: "row", message })
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(EmailProviderError);
      expect((error as EmailProviderError).retryable).toBe(retryable);
      expect((error as Error).message).not.toContain("secret");
      expect((error as Error).message).not.toContain(message.to);
    }
  });

  it("returns the same mock provider identity for the same logical email", async () => {
    const provider = new MockEmailProvider();
    const first = await provider.send({ idempotencyKey: "same", message });
    const second = await provider.send({ idempotencyKey: "same", message });
    expect(second).toEqual(first);
  });
});
