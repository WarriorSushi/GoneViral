"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RaisePoller() {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started >= 60_000) return window.clearInterval(timer);
      router.refresh();
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [router]);
  return <p role="status">Waiting for Dodo Payments’ signed confirmation…</p>;
}
