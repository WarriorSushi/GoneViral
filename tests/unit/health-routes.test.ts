import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/server/db/client", () => ({ getSqlClient: () => query }));

import { GET as live } from "@/app/api/health/live/route";
import { GET as ready } from "@/app/api/health/ready/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("safe health endpoints", () => {
  it("returns a data-free liveness response and a bounded correlation ID", async () => {
    const response = live(
      new Request("https://goneviral.in/api/health/live", {
        headers: { "x-request-id": "request-safe-123" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("request-safe-123");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("reports only ready/unavailable and never exposes database errors", async () => {
    query.mockResolvedValueOnce([{ ready: 1 }]);
    const healthy = await ready(
      new Request("https://goneviral.in/api/health/ready"),
    );
    expect(healthy.status).toBe(200);
    await expect(healthy.json()).resolves.toEqual({ status: "ready" });

    query.mockRejectedValueOnce(
      new Error("postgres://user:secret@private-db.example/internal"),
    );
    const failed = await ready(
      new Request("https://goneviral.in/api/health/ready"),
    );
    expect(failed.status).toBe(503);
    const body = JSON.stringify(await failed.json());
    expect(body).toBe('{"status":"unavailable"}');
    expect(body).not.toContain("postgres");
    expect(body).not.toContain("secret");
  });
});
