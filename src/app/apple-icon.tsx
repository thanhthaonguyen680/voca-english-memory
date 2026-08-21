import { ImageResponse } from "next/og";

// iOS "Add to Home Screen" uses this (not icon.svg — Safari doesn't accept SVG for the
// home-screen icon). No border/rounded corners here on purpose: iOS applies its own rounded
// mask over a full-bleed square image, so pre-rounding it would double up the edge.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background: "#c4b5fd",
        }}
      >
        <div
          style={{
            fontSize: 100,
            fontWeight: 800,
            color: "#000000",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          V
        </div>
      </div>
    ),
    { ...size },
  );
}
