const TARGET_PATH = "/api/internal/synthetic-scheduler-failure";
const TOTAL_TIMEOUT_MS = 45_000;

function parseBaseUrl(input) {
  const url = new URL(input);
  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error("invalid_base_url");
  }
  return url.origin;
}

const syntheticSchedulerCertificationWorker = {
  async scheduled(_controller, environment) {
    const baseUrl = parseBaseUrl(
      environment.GONEVIRAL_SYNTHETIC_FAILURE_BASE_URL,
    );
    if (!environment.SYNTHETIC_CERTIFICATION_TOKEN) {
      throw new Error("missing_certification_token");
    }

    let status = 0;
    try {
      const response = await fetch(`${baseUrl}${TARGET_PATH}`, {
        body: "",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "user-agent": "GoneViral-Synthetic-Scheduler-Certification/1",
          "x-goneviral-synthetic-certification":
            environment.SYNTHETIC_CERTIFICATION_TOKEN,
        },
        method: "POST",
        redirect: "manual",
        signal: AbortSignal.timeout(TOTAL_TIMEOUT_MS),
      });
      status = response.status;
      await response.body?.cancel();
    } catch {
      console.error("synthetic_scheduler_certification request=failed");
      throw new Error("synthetic_certification_failure");
    }

    console.error(`synthetic_scheduler_certification status=${status}`);
    throw new Error("synthetic_certification_failure");
  },
};

export default syntheticSchedulerCertificationWorker;
