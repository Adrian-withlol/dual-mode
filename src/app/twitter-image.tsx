import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Adrian Vela — Mechanical Engineering Student";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0b0f0d",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", color: "#4ade80", fontSize: 28, marginBottom: 28 }}>
          &gt;_ adrian@portfolio
        </div>
        <div
          style={{
            display: "flex",
            color: "#f5f5f0",
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          Adrian Vela
        </div>
        <div style={{ display: "flex", color: "#d9e2dc", fontSize: 36, marginTop: 20 }}>
          Mechanical engineering student at UTRGV
        </div>
        <div style={{ display: "flex", color: "#7c8a82", fontSize: 26, marginTop: 40 }}>
          Editorial overview · Interactive terminal
        </div>
      </div>
    ),
    { ...size }
  );
}
