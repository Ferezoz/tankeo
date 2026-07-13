import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #16a34a, #15803d)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 180, display: "flex" }}>⛽</div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "white",
            marginTop: 16,
            display: "flex",
          }}
        >
          Tankeo
        </div>
        <div
          style={{
            fontSize: 40,
            color: "rgba(255,255,255,0.9)",
            marginTop: 8,
            display: "flex",
          }}
        >
          Gasolina barata cerca de ti
        </div>
      </div>
    ),
    { ...size }
  );
}
