import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "עוזר הבחירות",
  description: "גלה לאיזו מפלגה אתה הכי קרוב",
};

// VERCEL_GIT_COMMIT_SHA is set automatically by Vercel at build time (server-side only, no NEXT_PUBLIC_ needed)
const buildId = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="bg-gray-50 text-gray-900 font-sans antialiased">
        {children}
        <div className="fixed bottom-2 right-2 text-xs text-gray-400 select-none pointer-events-none">
          {buildId}
        </div>
      </body>
    </html>
  );
}
