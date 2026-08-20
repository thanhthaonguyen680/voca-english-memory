import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/lib/language-context";
import "./globals.css";

// Chosen over the previous Geist setup for two reasons: (1) Geist was imported but never
// actually wired up — globals.css hardcoded `font-family: Arial, Helvetica, sans-serif` on
// <body>, so the app was silently rendering in plain Arial the whole time; (2) Be Vietnam Pro
// is designed specifically for Vietnamese text (proper diacritic spacing/shapes) and reads
// with more character than a generic geometric sans, fitting the "Notebook" theme better.
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Voca English Memory",
  description: "Học từ vựng qua câu chuyện được tạo bởi Ran Ran",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#FAF7F0] bg-[radial-gradient(#00000017_1.5px,transparent_1.5px)] bg-[length:22px_22px] text-black">
        <LanguageProvider>
          <Navbar />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
