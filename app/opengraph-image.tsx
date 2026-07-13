import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const mapData = await readFile(join(process.cwd(), "public/og-map-cropped.png"));
  const mapSrc = `data:image/png;base64,${mapData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: "linear-gradient(135deg, #16a34a, #15803d)",
        }}
      >
        <div
          style={{
            width: 600,
            height: 630,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 140, display: "flex" }}>⛽</div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "white",
              marginTop: 8,
              display: "flex",
            }}
          >
            Tankeo
          </div>
          <div
            style={{
              fontSize: 32,
              color: "rgba(255,255,255,0.9)",
              marginTop: 8,
              display: "flex",
              textAlign: "center",
              padding: "0 40px",
            }}
          >
            Gasolina barata cerca de ti
          </div>
        </div>
        <div
          style={{
            width: 600,
            height: 630,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={mapSrc}
            width={520}
            height={365}
            style={{
              borderRadius: 16,
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
