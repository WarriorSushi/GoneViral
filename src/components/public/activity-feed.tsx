import Link from "next/link";

import { formatIstDateTime } from "@/domain/public-time";
import type { PublicActivityItem } from "@/server/db/repositories/public-types";

import { Money } from "./money";

const labels = {
  added: "Added",
  adjusted: "Changed by",
  joined: "Joined with",
  restored: "Restored",
} as const;

export function ActivityFeed({
  items,
}: {
  readonly items: readonly PublicActivityItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="activity-section" aria-labelledby="activity-title">
      <div className="section-title-row">
        <h2 id="activity-title">Recent moves</h2>
      </div>
      <ol className="activity-list">
        {items.map((item) => (
          <li key={`${item.listingPublicId}-${item.appliedAt}-${item.kind}`}>
            <div className="activity-event">
              <Link href={`/l/${item.listingSlug}`}>{item.listingName}</Link>
              <p>
                {labels[item.kind]} <Money paise={item.amountDeltaPaise} />
              </p>
            </div>
            <strong className="activity-rank">
              Now #{item.currentMainRank}
            </strong>
            <time dateTime={item.appliedAt}>
              {formatIstDateTime(item.appliedAt)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
