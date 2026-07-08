import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS applies its own corner mask on home-screen icons, so this ships as a
// flat square (no border-radius) — matches app/icon.svg's ring-and-dot mark,
// just without the badge rounding that icon.svg draws itself.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F766E",
        }}
      >
        <div
          style={{
            width: 106,
            height: 106,
            borderRadius: "50%",
            border: "20px solid #FFFFFF",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#FFFFFF",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
