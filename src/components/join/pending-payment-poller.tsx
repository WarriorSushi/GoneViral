"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 3_000;
const POLL_LIMIT = 100;

export function PendingPaymentPoller({ publicId }: { publicId: string }) {
  const [message, setMessage] = useState("Waiting for payment confirmation…");

  useEffect(() => {
    let cancelled = false;
    let pollCount = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      pollCount += 1;
      try {
        const response = await fetch(
          `/api/join/${encodeURIComponent(publicId)}/status`,
          { cache: "no-store", credentials: "same-origin" },
        );
        const body = (await response.json()) as {
          resultPath?: string;
          status?: string;
        };
        if (cancelled) return;
        if (
          (body.status === "confirmed" || body.status === "reversed") &&
          body.resultPath
        ) {
          window.location.assign(body.resultPath);
          return;
        }
        if (body.status === "failed") {
          setMessage("The payment was not completed.");
          return;
        }
        if (response.status === 429) {
          setMessage("Still checking. We’ll try again shortly.");
        }
      } catch {
        if (!cancelled) {
          setMessage("We’re still checking. You can safely leave this page.");
        }
      }
      if (!cancelled && pollCount < POLL_LIMIT) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [publicId]);

  return (
    <p className="pending-live-status" role="status" aria-live="polite">
      {message}
    </p>
  );
}
