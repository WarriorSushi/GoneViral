import { beforeEach, describe, expect, it, vi } from "vitest";

import worker from "../../workers/synthetic-scheduler-certification/index.mjs";

const environment = {
  GONEVIRAL_SYNTHETIC_FAILURE_BASE_URL: "https://goneviral.in",
  SYNTHETIC_CERTIFICATION_TOKEN: "synthetic-test-token",
};

describe("synthetic scheduler certification Worker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls only the isolated HTTPS endpoint and then fails deliberately", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 503,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(worker.scheduled({}, environment)).rejects.toThrow(
      "synthetic_certification_failure",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://goneviral.in/api/internal/synthetic-scheduler-failure",
      expect.objectContaining({
        method: "POST",
        redirect: "manual",
        headers: expect.objectContaining({
          "x-goneviral-synthetic-certification": "synthetic-test-token",
        }),
      }),
    );
  });

  it("rejects unsafe origins before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      worker.scheduled(
        {},
        {
          ...environment,
          GONEVIRAL_SYNTHETIC_FAILURE_BASE_URL:
            "https://goneviral.in/unsafe?token=value",
        },
      ),
    ).rejects.toThrow("invalid_base_url");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never logs the token, origin, route, headers, or response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("private", { status: 503 })),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(worker.scheduled({}, environment)).rejects.toThrow();
    const output = error.mock.calls.flat().join(" ");
    expect(output).toContain("status=503");
    expect(output).not.toContain(environment.SYNTHETIC_CERTIFICATION_TOKEN);
    expect(output).not.toContain("goneviral.in");
    expect(output).not.toContain("private");
  });
});
