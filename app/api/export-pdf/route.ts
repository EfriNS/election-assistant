import { NextRequest, NextResponse } from "next/server";
import { buildPdfHtml, validatePdfResultsData } from "@/lib/pdf-template";

export const maxDuration = 60;

// Local dev: set CHROME_PATH in .env.local (e.g. /usr/bin/google-chrome-stable)
// Production: @sparticuz/chromium is used automatically when VERCEL env var is present

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null);
    const data = validatePdfResultsData(raw);
    if (!data) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const generatedAt = new Date().toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const fullHtml = buildPdfHtml(data, generatedAt);

    // Environment-aware Puppeteer setup
    let browser;

    if (process.env.VERCEL) {
      const chromium = (await import("@sparticuz/chromium")).default;
      const puppeteer = (await import("puppeteer-core")).default;
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else if (process.env.CHROME_PATH) {
      const puppeteer = (await import("puppeteer-core")).default;
      browser = await puppeteer.launch({
        executablePath: process.env.CHROME_PATH,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      });
    } else {
      return NextResponse.json(
        {
          error:
            "Local PDF generation requires CHROME_PATH in .env.local " +
            "(e.g. CHROME_PATH=/usr/bin/google-chrome-stable). " +
            "Or deploy to a Vercel preview to test.",
        },
        { status: 501 }
      );
    }

    try {
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: "load" });
      // Wait for Tailwind CDN + Google Fonts to finish loading before capturing
      await page.waitForNetworkIdle({ idleTime: 500 });

      const pdfBytes = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });

      const filename = encodeURIComponent("תוצאות-עוזר-הבחירות.pdf");
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="results.pdf"; filename*=UTF-8''${filename}`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("[export-pdf] generation failed:", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
