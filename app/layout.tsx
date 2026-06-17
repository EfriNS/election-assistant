import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ContentSquareTracker from "@/components/ContentSquareTracker";
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
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script defer src="https://t.contentsquare.net/uxa/fe934643ecf38.js" />
        <script type="text/javascript" dangerouslySetInnerHTML={{ __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","x8iv051fpw");` }} />
      </head>
      <body className="bg-gray-50 text-gray-900 font-sans antialiased">
        {children}
        <div className="fixed bottom-2 right-2 text-xs text-gray-500 select-none pointer-events-none">
          {buildId}
        </div>
        <Analytics />
        <ContentSquareTracker />
      </body>
    </html>
  );
}
