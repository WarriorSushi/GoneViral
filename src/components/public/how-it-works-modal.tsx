"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  focusableElements,
  lockRouteModalBackground,
} from "@/components/route-modal-utils";

export function HowItWorksModal({
  children,
}: {
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    const restoreBackground = lockRouteModalBackground(
      document.querySelector<HTMLElement>(".board-hero-secondary"),
    );
    window.requestAnimationFrame(() =>
      document
        .getElementById("how-it-works-dialog-title")
        ?.focus({ preventScroll: true }),
    );
    return restoreBackground;
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;

    const elements = focusableElements(contentRef.current);
    if (elements.length === 0) {
      event.preventDefault();
      return;
    }
    const first = elements[0]!;
    const last = elements.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="how-modal-layer"
      role="dialog"
      aria-labelledby="how-it-works-dialog-title"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      <div className="how-modal-backdrop" aria-hidden="true" />
      <section className="how-modal-panel">
        <div ref={contentRef} className="how-modal-content">
          <button
            type="button"
            className="how-modal-close"
            aria-label="Close how it works"
            onClick={close}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
          {children}
        </div>
      </section>
    </div>
  );
}
