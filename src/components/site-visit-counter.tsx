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

  if (total === null) return null;
  return <span>{visitFormatter.format(BigInt(total))} visits</span>;
}
