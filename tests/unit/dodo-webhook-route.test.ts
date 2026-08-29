import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { processDodoWebhook, revalidateTag, verifyAndNormalizeDodoWebhook } =
  vi.hoisted(() => ({
    processDodoWebhook: vi.fn(),
    revalidateTag: vi.fn(),
    verifyAndNormalizeDodoWebhook: vi.fn(),
  }));

vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/server/payments/dodo-webhook", () => ({
  getDodoWebhookConfiguration: () => ({
    businessId: "mock_business",
    environment: "mock",
  }),
  verifyAndNormalizeDodoWebhook,
}));
vi.mock("@/server/payments/process-dodo-webhook", () => ({
  processDodoWebhook,
}));

import { handleDodoWebhook } from "@/app/api/webhooks/dodo/route";

function request() {
  return new Request("http://localhost:3000/api/webhooks/dodo", {
    body: "{}",
    headers: {
      "content-type": "application/json",
      "webhook-id": "evt_route_test",
      "webhook-signature": "v1,test",
      "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
    },
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyAndNormalizeDodoWebhook.mockReturnValue({
    eventType: "payment.succeeded",
  });
});

describe("Dodo webhook response semantics", () => {
  it("acknowledges durable quarantine and duplicate outcomes", async () => {
    for (const kind of ["quarantined", "duplicate"]) {
      processDodoWebhook.mockResolvedValueOnce({ kind });
      const result = await handleDodoWebhook(request());
      expect(result.status).toBe(200);
      await expect(result.json()).resolves.toEqual({ status: kind });
    }
  });

  it("returns retryable failure when the database transaction fails", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    processDodoWebhook.mockRejectedValueOnce(new Error("database unavailable"));
    const result = await handleDodoWebhook(request());
    expect(result.status).toBe(503);
    expect(result.headers.get("x-request-id")).toBeTruthy();
    await expect(result.json()).resolves.toEqual({ status: "retry" });
    const serialized = String(error.mock.calls.at(-1)?.[0]);
    expect(serialized).not.toContain("database unavailable");
    expect(serialized).not.toMatch(/email|phone|secret/i);
    error.mockRestore();
  });

  it("acknowledges committed money even when cache invalidation fails", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    processDodoWebhook.mockResolvedValueOnce({
      businessDate: "2026-08-29",
      categorySlug: "tech-apps",
      kind: "processed",
      listingPublicId: "lst_route_test",
      listingSlug: "route-test",
    });
    revalidateTag.mockImplementationOnce(() => {
      throw new Error("cache unavailable");
    });
    const result = await handleDodoWebhook(request());
    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual({ status: "processed" });
    expect(processDodoWebhook).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it("rejects unauthenticated or malformed requests before processing", async () => {
    verifyAndNormalizeDodoWebhook.mockImplementationOnce(() => {
      throw new Error("invalid signature");
    });
    const result = await handleDodoWebhook(request());
    expect(result.status).toBe(400);
    expect(processDodoWebhook).not.toHaveBeenCalled();
  });
});
