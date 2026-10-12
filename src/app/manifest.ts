import type { MetadataRoute } from "next";

// Powers "Add to Home Screen" branding on Android/Chrome (name, icon, standalone display).
// iOS instead reads apple-icon.tsx directly — Safari on iOS doesn't use the manifest for the
// home-screen icon, only for a handful of other PWA behaviors.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voca English Memory",
    short_name: "Voca",
    description: "Học từ vựng bằng Cung điện trí nhớ (Memory Palace)",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F0",
    theme_color: "#c4b5fd",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
