import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "עוזר הבחירות",
  description: "גלה לאיזו מפלגה אתה הכי קרוב",
};

// BUILD_ID is injected by next.config.ts at build time (works both locally and on Vercel)
const buildId = process.env.BUILD_ID ?? "dev";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="bg-gray-50 text-gray-900 font-sans antialiased">
        {children}
        <div className="fixed bottom-2 right-2 text-xs text-gray-500 select-none pointer-events-none">
          {buildId}
        </div>
        <Analytics />
        <Script
          src="https://t.contentsquare.net/uxa/fe934643ecf38.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
