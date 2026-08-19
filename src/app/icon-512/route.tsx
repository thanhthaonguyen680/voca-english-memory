import { ImageResponse } from "next/og";

// See icon-192/route.tsx — same icon, larger size for manifest.ts.
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
            fontSize: 290,
            fontWeight: 800,
            color: "#000000",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          V
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
