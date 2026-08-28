import { ImageResponse } from "next/og";

export const alt = "GoneViral.in paid list for makers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#fbfaf7",
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
        Gone<span style={{ color: "#8f2430" }}>Viral</span>.in
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: "-4px" }}>
          Show your work. Move up.
        </div>
        <div style={{ fontSize: 30, marginTop: 24 }}>
          Add your work. Pay more to move it up.
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
        <span>A paid list for people who make things.</span>
        <span>GoneViral.in</span>
      </div>
    </div>,
    size,
  );
}
