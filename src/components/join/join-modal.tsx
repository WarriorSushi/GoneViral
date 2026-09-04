"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(root: HTMLElement | null) {
  if (!root) {
    return [];
  }

  return Array.from(
    root.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter(
    (element) =>
      !element.hidden && element.getAttribute("aria-hidden") !== "true",
  );
}

export function JoinModal({ children }: { readonly children: ReactNode }) {
  const router = useRouter();
  const historyGuardId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const confirmationReturnFocusRef = useRef<HTMLElement | null>(null);
  const triggerFocusRef = useRef<HTMLElement | null>(null);
  const dirtyRef = useRef(false);
  const allowNavigationRef = useRef(false);
  const guardAddedRef = useRef(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const leaveModal = useCallback(() => {
    allowNavigationRef.current = true;
    if (guardAddedRef.current) {
      window.history.go(-2);
    } else {
      router.back();
    }
  }, [router]);

  const requestClose = useCallback(() => {
    if (!dirtyRef.current) {
      leaveModal();
      return;
    }

    confirmationReturnFocusRef.current =
      document.activeElement as HTMLElement | null;
    setConfirmingDiscard(true);
  }, [leaveModal]);

  function keepEditing() {
    setConfirmingDiscard(false);
    window.requestAnimationFrame(() =>
      confirmationReturnFocusRef.current?.focus(),
    );
  }

  useEffect(() => {
    const page = document.getElementById("site-content");
    const previouslyInert = page?.inert ?? false;
    const previousAriaHidden = page ? page.getAttribute("aria-hidden") : null;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    triggerFocusRef.current = document.activeElement as HTMLElement | null;
    if (page) {
      page.inert = true;
      page.setAttribute("aria-hidden", "true");
    }
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    if (window.history.state?.goneViralJoinGuard !== historyGuardId) {
      window.history.pushState(
        { ...window.history.state, goneViralJoinGuard: historyGuardId },
        "",
        window.location.href,
      );
    }
    guardAddedRef.current = true;

    const title = document.getElementById("join-dialog-title");
    window.requestAnimationFrame(() => {
      panelRef.current?.scrollTo({ top: 0 });
      title?.focus({ preventScroll: true });
    });

    const handlePopState = (event: PopStateEvent) => {
      if (allowNavigationRef.current) {
        return;
      }

      const isGuardEntry = event.state?.goneViralJoinGuard === historyGuardId;
      if (isGuardEntry) {
        return;
      }

      if (dirtyRef.current) {
        confirmationReturnFocusRef.current =
          document.activeElement as HTMLElement | null;
        setConfirmingDiscard(true);
        window.history.forward();
      } else {
        allowNavigationRef.current = true;
        window.history.back();
      }
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current && !allowNavigationRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (page) {
        page.inert = previouslyInert;
        if (previousAriaHidden === null) {
          page.removeAttribute("aria-hidden");
        } else {
          page.setAttribute("aria-hidden", previousAriaHidden);
        }
      }
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
      if (triggerFocusRef.current?.isConnected) {
        triggerFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, [historyGuardId]);

  useEffect(() => {
    if (!confirmingDiscard) {
      return;
    }

    const keepButton =
      confirmationRef.current?.querySelector<HTMLButtonElement>(
        "[data-keep-editing]",
      );
    window.requestAnimationFrame(() => keepButton?.focus());
  }, [confirmingDiscard]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (
      event.key === "Escape" &&
      window.matchMedia("(min-width: 821px)").matches
    ) {
      event.preventDefault();
      if (confirmingDiscard) {
        keepEditing();
      } else {
        requestClose();
      }
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const scope = confirmingDiscard
      ? confirmationRef.current
      : modalContentRef.current;
    const elements = focusableElements(scope);
    if (elements.length === 0) {
      event.preventDefault();
      return;
    }

    const first = elements[0]!;
    const last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="join-modal-layer"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-labelledby="join-dialog-title"
      aria-modal="true"
    >
      <div className="join-modal-backdrop" aria-hidden="true" />
      <section
        ref={panelRef}
        className="join-modal-panel"
        onChangeCapture={() => {
          dirtyRef.current = true;
        }}
        onInputCapture={() => {
          dirtyRef.current = true;
        }}
      >
        <div
          ref={modalContentRef}
          className="join-modal-content"
          aria-hidden={confirmingDiscard ? "true" : undefined}
          inert={confirmingDiscard ? true : undefined}
        >
          <button
            type="button"
            className="join-modal-close"
            aria-label="Close get listed form"
            onClick={requestClose}
          >
            <svg
              className="join-modal-close-desktop"
              aria-hidden="true"
              viewBox="0 0 24 24"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
            <svg
              className="join-modal-close-mobile"
              aria-hidden="true"
              viewBox="0 0 24 24"
            >
              <path d="m15 5-7 7 7 7" />
            </svg>
            <span className="join-modal-close-mobile">Back</span>
          </button>
          <div className="join-modal-form-shell">{children}</div>
        </div>

        {confirmingDiscard ? (
          <div className="join-discard-layer">
            <div
              ref={confirmationRef}
              className="join-discard-dialog"
              role="alertdialog"
              aria-labelledby="join-discard-title"
              aria-describedby="join-discard-description"
              aria-modal="true"
            >
              <h2 id="join-discard-title">Discard your changes?</h2>
              <p id="join-discard-description">
                Your entered information will be lost.
              </p>
              <div className="join-discard-actions">
                <button
                  type="button"
                  className="button button-primary"
                  data-keep-editing
                  onClick={keepEditing}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={leaveModal}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
