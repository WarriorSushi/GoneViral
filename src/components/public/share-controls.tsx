"use client";

import { useState } from "react";

export function buildShareText(listingName: string, currentRank: string) {
  return `${listingName} is currently #${currentRank} on the paid GoneViral.in leaderboard.`;
}

export function ShareControls({
  currentRank,
  listingName,
  listingPath,
}: {
  readonly currentRank: string;
  readonly listingName: string;
  readonly listingPath: string;
}) {
  const [status, setStatus] = useState<"copied" | "error" | "idle" | "shared">(
    "idle",
  );
  const text = buildShareText(listingName, currentRank);

  async function share() {
    try {
      const url = new URL(listingPath, window.location.origin).href;
      if (navigator.share) {
        await navigator.share({
          text,
          title: `${listingName} on GoneViral.in`,
          url,
        });
        setStatus("shared");
        return;
      }
      await copyResult(url);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
    }
  }

  async function copyResult(url: string) {
    if (!navigator.clipboard) throw new Error("clipboard_unavailable");
    await navigator.clipboard.writeText(`${text} ${url}`);
    setStatus("copied");
  }

  async function copy() {
    try {
      await copyResult(new URL(listingPath, window.location.origin).href);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className="share-controls"
      aria-label="Share this current result"
      role="region"
    >
      <p>
        Share the confirmed result: <strong>#{currentRank}</strong> now.
      </p>
      <div>
        <button
          className="button button-secondary"
          onClick={share}
          type="button"
        >
          Share
        </button>
        <button
          className="button button-secondary"
          onClick={copy}
          type="button"
        >
          Copy result
        </button>
        <a
          className="button button-secondary"
          download={`${listingName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-goneviral.png`}
          href={`${listingPath}/opengraph-image`}
        >
          Download image
        </a>
      </div>
      <span aria-live="polite">
        {status === "copied"
          ? "Result copied."
          : status === "shared"
            ? "Shared."
            : status === "error"
              ? "Sharing is unavailable in this browser."
              : ""}
      </span>
    </div>
  );
}
