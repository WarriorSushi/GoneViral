const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function focusableElements(root: HTMLElement | null) {
  if (!root) return [];

  return Array.from(
    root.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter(
    (element) =>
      !element.hidden && element.getAttribute("aria-hidden") !== "true",
  );
}

export function lockRouteModalBackground(
  fallbackTrigger: HTMLElement | null = null,
) {
  const page = document.getElementById("site-content");
  const activeElement = document.activeElement as HTMLElement | null;
  const trigger =
    activeElement &&
    activeElement !== document.body &&
    activeElement !== document.documentElement
      ? activeElement
      : fallbackTrigger;
  const previouslyInert = page?.inert ?? false;
  const previousAriaHidden = page?.getAttribute("aria-hidden") ?? null;
  const previousHtmlOverflow = document.documentElement.style.overflow;
  const previousBodyOverflow = document.body.style.overflow;
  const previousBodyPaddingRight = document.body.style.paddingRight;
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;

  if (page) {
    page.inert = true;
    page.setAttribute("aria-hidden", "true");
  }
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  return () => {
    if (page) {
      page.inert = previouslyInert;
      if (previousAriaHidden === null) page.removeAttribute("aria-hidden");
      else page.setAttribute("aria-hidden", previousAriaHidden);
    }
    document.documentElement.style.overflow = previousHtmlOverflow;
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  };
}
