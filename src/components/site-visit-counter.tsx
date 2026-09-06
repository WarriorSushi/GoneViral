"use client";

import { useEffect, useState } from "react";

const visitFormatter = new Intl.NumberFormat("en-IN");

export function SiteVisitCounter() {
  const [total, setTotal] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/site-visits", {
      credentials: "same-origin",
      method: "POST",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: unknown) => {
        if (
          result &&
          typeof result === "object" &&
          "totalVisits" in result &&
          typeof result.totalVisits === "string" &&
          /^\d+$/.test(result.totalVisits)
        ) {
          setTotal(result.totalVisits);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const formattedTotal =
    total === null ? "0" : visitFormatter.format(BigInt(total));
  return (
    <span
      aria-hidden={total === null}
      aria-live="polite"
      className="site-visit-capsule"
      data-ready={total !== null}
      title="Estimated cumulative visits"
    >
      {formattedTotal} {total === "1" ? "visit" : "visits"}
    </span>
  );
}
