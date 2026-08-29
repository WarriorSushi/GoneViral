import { ImageResponse } from "next/og";
import { connection } from "next/server";

import { toIstBusinessDate } from "@/domain/today";
import { getCachedPublicListingDetail } from "@/server/cache/public-read-model";

export const alt = "Current sponsored GoneViral.in listing position";
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const listing = await getCachedPublicListingDetail(
    slug,
    toIstBusinessDate(new Date()),
  );
  const snapshotAt = listing
    ? new Date(listing.takeoverQuote.estimatedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : null;

  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#fff7e9",
        color: "#17120d",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px 72px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#715cff", fontSize: 34, fontWeight: 700 }}>
          GoneViral.in
        </span>
        <span style={{ fontSize: 27 }}>Sponsored placement</span>
      </div>
      {listing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 32 }}>{listing.category.name}</span>
          <strong style={{ fontSize: 76, letterSpacing: -3 }}>
            {listing.name}
          </strong>
          <span style={{ color: "#715cff", fontSize: 112, fontWeight: 800 }}>
            Current rank #{listing.currentMainRank}
          </span>
        </div>
      ) : (
        <strong style={{ fontSize: 72 }}>Listing unavailable</strong>
      )}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 28 }}>
          {listing
            ? `${listing.uniqueClicks} tracked outbound clicks`
            : "No rank shown"}
        </span>
        <span style={{ fontSize: 24 }}>
          {snapshotAt ? `Current at ${snapshotAt} IST` : "goneviral.in"}
        </span>
      </div>
    </div>,
    size,
  );
}
