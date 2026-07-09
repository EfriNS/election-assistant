import type { Metadata } from "next";
import { headers } from "next/headers";
import { Rubik } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import FeedbackWidget from "@/components/FeedbackWidget";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "עוזר הבחירות",
  description: "גלה לאיזו מפלגה אתה הכי קרוב",
};

// BUILD_ID/DEPLOY_ENV are injected by next.config.ts at build time (works both locally and on Vercel)
const buildId = process.env.BUILD_ID ?? "dev";
const isPreview = process.env.DEPLOY_ENV !== "production";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Per-request CSP nonce set by middleware.ts (production only). Reading it here
  // opts every route into dynamic rendering — an inherent cost of a nonce CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <head>
        {/* Microsoft Clarity — the single session-replay/heatmap tracker (Hotjar +
            ContentSquare removed 2026-07). All page text is masked via
            data-clarity-mask on <body> below, because the quiz records users'
            political opinions (special-category data). Belt-and-suspenders: the
            Clarity dashboard masking mode should also be set to "Strict".
            nonce lets this inline script run under the enforced CSP; Clarity's own
            injected script is then trusted via 'strict-dynamic'. */}
        <script nonce={nonce} type="text/javascript" dangerouslySetInnerHTML={{ __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","x8iv051fpw");` }} />
      </head>
      <body className="bg-gray-50 text-gray-900 font-sans antialiased" data-clarity-mask="true">
        {isPreview && (
          <div className="text-center text-xs font-medium text-amber-800 bg-amber-100 border-b border-amber-200 py-1.5 px-3">
            גרסת Preview — לצורכי בדיקה בלבד, לא הגרסה הסופית
          </div>
        )}
        {children}
        <div className="fixed bottom-2 right-2 text-xs text-gray-500 select-none pointer-events-none">
          {buildId}
        </div>
        <FeedbackWidget />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
