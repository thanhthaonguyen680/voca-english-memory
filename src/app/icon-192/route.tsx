import { ImageResponse } from "next/og";

// Referenced by manifest.ts for Android's "Add to Home Screen" icon. Not the App Router
// icon.tsx/apple-icon.tsx convention (those only support one size each) — a plain route handler
// returning ImageResponse is the standard way to serve extra icon sizes for a manifest.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6ee7b7",
        }}
      >
        <div
          style={{
            fontSize: 110,
            fontWeight: 800,
            color: "#000000",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          V
        </div>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
