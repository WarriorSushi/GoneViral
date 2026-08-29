import Link from "next/link";

import type { PublicActivityItem } from "@/server/db/repositories/public-types";

import { Money } from "./money";

const labels = {
  added: "added",
  adjusted: "changed by",
  joined: "joined with",
  restored: "had restored",
} as const;

export function ActivityFeed({
  items,
}: {
  readonly items: readonly PublicActivityItem[];
}) {
  return (
    <section className="activity-section" aria-labelledby="activity-title">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Committed activity</p>
          <h2 id="activity-title">What actually moved</h2>
        </div>
        <p>Confirmed ledger events only. No simulated activity.</p>
      </div>
      {items.length ? (
        <ol className="activity-list">
          {items.map((item) => (
            <li key={`${item.listingPublicId}-${item.appliedAt}-${item.kind}`}>
              <p>
                <Link href={`/l/${item.listingSlug}`}>{item.listingName}</Link>{" "}
                {labels[item.kind]} <Money paise={item.amountDeltaPaise} />
              </p>
              <span>Now #{item.currentMainRank}</span>
              <time dateTime={item.appliedAt}>
                {new Date(item.appliedAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Kolkata",
                })}{" "}
                IST
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="quiet-empty">No confirmed public movement yet.</p>
      )}
    </section>
  );
}
