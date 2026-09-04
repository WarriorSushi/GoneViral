import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  deliverEmailOutboxById,
  processDodoWebhook,
  revalidateTag,
  verifyAndNormalizeDodoWebhook,
} = vi.hoisted(() => ({
  deliverEmailOutboxById: vi.fn(),
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
vi.mock("@/server/email/outbox", () => ({ deliverEmailOutboxById }));

import { handleDodoWebhook } from "@/app/api/webhooks/dodo/route";

function request() {
  return new Request("http://localhost:3000/api/webhooks/dodo", {
    body: "{}",
    headers: {
      "content-type": "application/json",
      "x-request-id": "req_dodo_route_test",
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
  deliverEmailOutboxById.mockResolvedValue({
    claimed: 1,
    deadLetter: 0,
    retryable: 0,
    sent: 1,
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

  it("schedules an immediate post-commit confirmation-email attempt", async () => {
    processDodoWebhook.mockResolvedValueOnce({
      emailOutboxId: "outbox-route-test",
      kind: "processed",
      listingPublicId: "lst_route_test",
    });
    let scheduledTask: (() => Promise<void>) | undefined;

    const result = await handleDodoWebhook(request(), (task) => {
      scheduledTask = task as () => Promise<void>;
    });

    expect(result.status).toBe(200);
    expect(deliverEmailOutboxById).not.toHaveBeenCalled();
    expect(scheduledTask).toBeTypeOf("function");
    await scheduledTask?.();
    expect(deliverEmailOutboxById).toHaveBeenCalledWith("outbox-route-test");
  });

  it("still acknowledges committed money when immediate delivery fails", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    processDodoWebhook.mockResolvedValueOnce({
      emailOutboxId: "outbox-route-test",
      kind: "processed",
    });
    deliverEmailOutboxById.mockRejectedValueOnce(new Error("database offline"));
    let scheduledTask: (() => Promise<void>) | undefined;

    const result = await handleDodoWebhook(request(), (task) => {
      scheduledTask = task as () => Promise<void>;
    });
    await scheduledTask?.();

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual({ status: "processed" });
    expect(String(error.mock.calls.at(-1)?.[0])).not.toContain(
      "database offline",
    );
    error.mockRestore();
  });

  it("does not schedule another email for a duplicate webhook", async () => {
    processDodoWebhook.mockResolvedValueOnce({ kind: "duplicate" });
    const scheduleAfterResponse = vi.fn();

    const result = await handleDodoWebhook(request(), scheduleAfterResponse);

    expect(result.status).toBe(200);
    expect(scheduleAfterResponse).not.toHaveBeenCalled();
    expect(deliverEmailOutboxById).not.toHaveBeenCalled();
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
