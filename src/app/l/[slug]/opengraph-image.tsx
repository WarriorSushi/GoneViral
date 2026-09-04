import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { createElement } from "react";
import sharp from "sharp";

import goneViralLogo from "@/app/GoneViral.in logo.png";
import { formatInr, moneyPaise } from "@/domain/money";
import { toIstBusinessDate } from "@/domain/today";
import { getCachedPublicListingDetail } from "@/server/cache/public-read-model";

export const alt = "Current paid GoneViral.in listing position";
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };

const brandLogoSrc = new URL(goneViralLogo.src, "https://goneviral.in").href;

async function getShareCardLogo(logoUrl: string | null) {
  if (!logoUrl) return brandLogoSrc;

  try {
    const response = await fetch(logoUrl, { cache: "force-cache" });
    if (!response.ok) return brandLogoSrc;

    const png = await sharp(Buffer.from(await response.arrayBuffer()))
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return brandLogoSrc;
  }
}

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
  const listingLogoSrc = await getShareCardLogo(listing?.logoUrl ?? null);
  const listingNameSize = !listing
    ? 66
    : listing.name.length > 34
      ? 48
      : listing.name.length > 22
        ? 58
        : 68;

  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background:
          "linear-gradient(135deg, #12141c 0%, #1b1d27 62%, #35191d 100%)",
        color: "#fbfaf7",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        justifyContent: "space-between",
        overflow: "hidden",
        padding: "52px 58px 44px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#9f2d36",
          borderRadius: 999,
          display: "flex",
          height: 360,
          opacity: 0.18,
          position: "absolute",
          right: -140,
          top: -170,
          width: 360,
        }}
      />
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: 16 }}>
          {createElement("img", {
            alt: "",
            height: 52,
            src: brandLogoSrc,
            width: 52,
          })}
          <span style={{ fontSize: 31, fontWeight: 800, letterSpacing: -1 }}>
            Gone<span style={{ color: "#f3a33c" }}>Viral</span>.in
          </span>
        </div>
        <span
          style={{
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 999,
            color: "#f5d9d9",
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: 2,
            padding: "11px 18px",
            textTransform: "uppercase",
          }}
        >
          Paid placement
        </span>
      </div>
      {listing ? (
        <div
          style={{
            alignItems: "stretch",
            display: "flex",
            gap: 44,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 0,
            }}
          >
            <div style={{ alignItems: "center", display: "flex", gap: 22 }}>
              <div
                style={{
                  alignItems: "center",
                  background: "#fbfaf7",
                  borderRadius: 16,
                  display: "flex",
                  height: 94,
                  justifyContent: "center",
                  overflow: "hidden",
                  padding: 12,
                  width: 94,
                }}
              >
                {createElement("img", {
                  alt: "",
                  height: 70,
                  src: listingLogoSrc,
                  style: { objectFit: "contain" },
                  width: 70,
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span
                  style={{
                    color: "#d9d5cf",
                    fontSize: 21,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  {listing.category.name}
                </span>
                <span style={{ color: "#f3a33c", fontSize: 21 }}>
                  Featured on GoneViral.in
                </span>
              </div>
            </div>
            <strong
              style={{
                fontSize: listingNameSize,
                letterSpacing: -2,
                lineHeight: 1.02,
                marginTop: 24,
                maxWidth: 660,
              }}
            >
              {listing.name}
            </strong>
          </div>
          <div
            style={{
              alignItems: "center",
              background: "#fbf3e7",
              borderRadius: 20,
              color: "#17120d",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 330,
              padding: "30px 34px",
            }}
          >
            <span
              style={{
                color: "#7d202b",
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: 2.2,
                textTransform: "uppercase",
              }}
            >
              Current position
            </span>
            <span
              style={{
                color: "#9f2d36",
                fontSize: 132,
                fontWeight: 900,
                letterSpacing: -8,
                lineHeight: 0.95,
                marginTop: 12,
              }}
            >
              #{listing.currentMainRank}
            </span>
            <span style={{ fontSize: 22, marginTop: 14 }}>
              {formatInr(moneyPaise(BigInt(listing.confirmedTotalPaise)))}{" "}
              confirmed
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flex: 1,
            fontSize: 66,
            fontWeight: 800,
            justifyContent: "center",
          }}
        >
          Listing unavailable
        </div>
      )}
      <div
        style={{
          alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.18)",
          color: "#d9d5cf",
          display: "flex",
          fontSize: 20,
          justifyContent: "space-between",
          paddingTop: 20,
          position: "relative",
        }}
      >
        <span>
          {listing
            ? `${listing.uniqueClicks} tracked outbound ${listing.uniqueClicks === "1" ? "visit" : "visits"}`
            : "No rank shown"}
        </span>
        <span style={{ color: "#fbfaf7", fontWeight: 700 }}>
          Pay. Get seen.
        </span>
        <span>
          {snapshotAt ? `Current at ${snapshotAt} IST` : "goneviral.in"}
        </span>
      </div>
    </div>,
    size,
  );
}
