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

function rankTier(rank: string) {
  const value = Number.parseInt(rank, 10);
  if (value <= 3) return "TOP 3";
  if (value <= 10) return "TOP 10";
  return `RANKED #${rank}`;
}

function truncate(value: string, length: number) {
  return value.length > length
    ? `${value.slice(0, length - 1).trim()}…`
    : value;
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
  const rankCheckedAt = listing
    ? new Date(listing.takeoverQuote.estimatedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : null;
  const listingLogoSrc = await getShareCardLogo(listing?.logoUrl ?? null);
  const listingNameSize = !listing
    ? 64
    : listing.name.length > 36
      ? 45
      : listing.name.length > 24
        ? 52
        : 60;

  return new ImageResponse(
    <div
      style={{
        background:
          "linear-gradient(125deg, #07111f 0%, #0b1322 54%, #281015 100%)",
        color: "#fffaf3",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        overflow: "hidden",
        padding: "38px 48px 34px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(159,45,54,0.68), rgba(247,166,62,0.14))",
          borderRadius: 999,
          display: "flex",
          height: 470,
          position: "absolute",
          right: -190,
          top: -250,
          transform: "rotate(-16deg)",
          width: 620,
        }}
      />
      <div
        style={{
          background: "rgba(247,166,62,0.12)",
          borderRadius: 999,
          bottom: -210,
          display: "flex",
          height: 420,
          left: -120,
          position: "absolute",
          width: 720,
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
        <div style={{ alignItems: "center", display: "flex", gap: 14 }}>
          {createElement("img", {
            alt: "",
            height: 50,
            src: brandLogoSrc,
            width: 50,
          })}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}
            >
              Gone<span style={{ color: "#f3a33c" }}>Viral</span>.in
            </span>
            <span
              style={{
                color: "#aeb5c1",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                marginTop: 2,
              }}
            >
              THE PAID LEADERBOARD
            </span>
          </div>
        </div>
        <span
          style={{
            border: "1px solid rgba(247,166,62,0.72)",
            borderRadius: 999,
            color: "#ffd59c",
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 2.6,
            padding: "10px 18px",
          }}
        >
          SPONSORED RANKING
        </span>
      </div>

      {listing ? (
        <div
          style={{
            alignItems: "stretch",
            display: "flex",
            flex: 1,
            gap: 40,
            paddingTop: 34,
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
              paddingBottom: 18,
            }}
          >
            <div style={{ alignItems: "center", display: "flex", gap: 22 }}>
              <div
                style={{
                  alignItems: "center",
                  background: "#fffaf3",
                  border: "1px solid rgba(247,166,62,0.66)",
                  borderRadius: 24,
                  display: "flex",
                  height: 124,
                  justifyContent: "center",
                  overflow: "hidden",
                  padding: 12,
                  width: 124,
                }}
              >
                {createElement("img", {
                  alt: "",
                  height: 100,
                  src: listingLogoSrc,
                  style: { objectFit: "contain" },
                  width: 100,
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span
                  style={{
                    color: "#f7a63e",
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: 2.5,
                  }}
                >
                  {listing.category.name.toUpperCase()}
                </span>
                <span style={{ color: "#c3c8d1", fontSize: 17 }}>
                  Featured on GoneViral.in
                </span>
              </div>
            </div>
            <strong
              style={{
                fontSize: listingNameSize,
                letterSpacing: -1.8,
                lineHeight: 1.02,
                marginTop: 22,
                maxWidth: 650,
              }}
            >
              {listing.name}
            </strong>
            <span
              style={{
                color: "#aeb5c1",
                fontSize: 20,
                lineHeight: 1.35,
                marginTop: 12,
                maxWidth: 610,
              }}
            >
              {truncate(listing.tagline, 96)}
            </span>
          </div>

          <div
            style={{
              alignItems: "center",
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.095), rgba(255,255,255,0.035))",
              border: "1px solid rgba(247,166,62,0.5)",
              borderRadius: 28,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 380,
              padding: "22px 30px 24px",
            }}
          >
            <span
              style={{
                color: "#ffd59c",
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: 4,
              }}
            >
              {rankTier(listing.currentMainRank)}
            </span>
            <span
              style={{
                color: "#ffad3d",
                fontSize: 154,
                fontWeight: 900,
                letterSpacing: -6,
                lineHeight: 0.9,
                marginTop: 18,
              }}
            >
              #{listing.currentMainRank}
            </span>
            <span
              style={{
                color: "#fffaf3",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 4,
                marginTop: 18,
              }}
            >
              ON GONEVIRAL.IN
            </span>
            <div
              style={{
                background: "rgba(247,166,62,0.55)",
                display: "flex",
                height: 1,
                margin: "21px 0 17px",
                width: "100%",
              }}
            />
            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <strong style={{ fontSize: 24 }}>
                  {formatInr(moneyPaise(BigInt(listing.confirmedTotalPaise)))}
                </strong>
                <span
                  style={{
                    color: "#aeb5c1",
                    fontSize: 11,
                    letterSpacing: 1.8,
                    marginTop: 3,
                  }}
                >
                  TOTAL PLACEMENT
                </span>
              </div>
              <div
                style={{
                  alignItems: "flex-end",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <strong style={{ fontSize: 18 }}>{rankCheckedAt}</strong>
                <span
                  style={{
                    color: "#aeb5c1",
                    fontSize: 11,
                    letterSpacing: 1.8,
                    marginTop: 5,
                  }}
                >
                  RANK CHECKED
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flex: 1,
            fontSize: 64,
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
          borderTop: "1px solid rgba(255,255,255,0.16)",
          color: "#aeb5c1",
          display: "flex",
          fontSize: 15,
          justifyContent: "space-between",
          letterSpacing: 2,
          paddingTop: 18,
          position: "relative",
        }}
      >
        <span>FEATURED ON GONEVIRAL.IN</span>
        <span style={{ color: "#ffd59c", fontWeight: 800 }}>
          PAY MORE. RANK HIGHER.
        </span>
        <span>GONEVIRAL.IN</span>
      </div>
    </div>,
    size,
  );
}
