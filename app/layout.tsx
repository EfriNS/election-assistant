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

const HOTJAR_SITE_ID = 6507347;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="bg-gray-50 text-gray-900 font-sans antialiased">
        {children}
        <div className="fixed bottom-2 right-2 text-xs text-gray-500 select-none pointer-events-none">
          {buildId}
        </div>
        <Analytics />
        <Script id="hotjar" strategy="afterInteractive">{`
          (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${HOTJAR_SITE_ID},hjsv:6};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `}</Script>
      </body>
    </html>
  );
}
