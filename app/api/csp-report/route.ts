import { NextRequest, NextResponse } from "next/server";

// Receives browser CSP violation reports (the `report-uri` directive in
// middleware.ts). Logs to the server console (Vercel logs) so the enforced
// policy's real-world blocks are visible during rollout — this is the safety net
// for the "CSP silently breaks a third-party script" failure mode.
//
// Deliberately cheap and quiet: it only logs, and does NOT alert Slack, because
// CSP reports are noisy (browser extensions, injected scripts, ISP proxies all
// trip them). Review the logs periodically rather than alerting per report.
// Safe to delete once the policy has proven stable in production.
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    console.warn("[csp-report]", body.slice(0, 2000));
  } catch {
    // Malformed/empty report — nothing actionable, ignore.
  }
  return new NextResponse(null, { status: 204 });
}
