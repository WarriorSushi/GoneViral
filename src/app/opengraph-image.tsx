import { ImageResponse } from "next/og";

export const alt = "GoneViral.in sponsored internet leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#f4f1ea",
        color: "#14120f",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", fontSize: 32, fontWeight: 800 }}>
        GONEVIRAL<span style={{ color: "#ea4322" }}>.IN</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: "-4px" }}>
          Pay more. Rank higher.
        </div>
        <div style={{ fontSize: 30, marginTop: 24 }}>
          Sponsored rankings ordered only by confirmed sponsorship amounts.
        </div>
      </div>
      <div
        style={{
          borderTop: "2px solid #14120f",
          display: "flex",
          fontSize: 24,
          justifyContent: "space-between",
          paddingTop: 24,
        }}
      >
        <span>No votes. No algorithm.</span>
        <span>goneviral.in</span>
      </div>
    </div>,
    size,
  );
}
