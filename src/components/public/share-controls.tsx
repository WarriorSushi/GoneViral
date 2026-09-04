"use client";

import Image from "next/image";
import { useState } from "react";

export function buildShareText(listingName: string, currentRank: string) {
  return `${listingName} is currently #${currentRank} on the paid GoneViral.in leaderboard.`;
}

export function ShareControls({
  currentRank,
  listingName,
  listingPath,
  showPreview = false,
}: {
  readonly currentRank: string;
  readonly listingName: string;
  readonly listingPath: string;
  readonly showPreview?: boolean;
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
      className={`share-controls${showPreview ? "share-controls-featured" : ""}`}
      aria-label="Share this current result"
      role="region"
    >
      {showPreview ? (
        <div className="share-card-preview">
          <Image
            alt={`Share card preview for ${listingName}`}
            height={630}
            src={`${listingPath}/opengraph-image`}
            unoptimized
            width={1200}
          />
        </div>
      ) : null}
      <div className="share-controls-content">
        <div className="share-controls-copy">
          <strong>Turn your rank into reach.</strong>
          <p>
            Share your current <b>#{currentRank}</b> position with a ready-made
            social card.
          </p>
        </div>
        <div className="share-actions">
          <button
            className="button button-primary"
            onClick={share}
            type="button"
          >
            <ShareIcon />
            Share result
          </button>
          <button
            className="button button-secondary"
            onClick={copy}
            type="button"
          >
            <CopyIcon />
            Copy post
          </button>
          <a
            className="button button-secondary"
            download={`${listingName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-goneviral.png`}
            href={`${listingPath}/opengraph-image`}
          >
            <DownloadIcon />
            Download card
          </a>
        </div>
        <span
          aria-live="polite"
          className={
            status === "error"
              ? "error-status"
              : status === "copied" || status === "shared"
                ? "success-status"
                : undefined
          }
        >
          {status === "copied"
            ? "Post copy and link copied."
            : status === "shared"
              ? "Shared."
              : status === "error"
                ? "Sharing is unavailable in this browser."
                : ""}
        </span>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="12" rx="2" width="12" x="8" y="8" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3v12m-4-4 4 4 4-4M5 20h14" />
    </svg>
  );
}
