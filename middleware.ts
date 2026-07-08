import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Limiters = {
  page: Ratelimit;
  followUp: Ratelimit;
  score: Ratelimit;
  results: Ratelimit;
  pdf: Ratelimit;
  feedback: Ratelimit;
};

// Limiters are only active when Upstash credentials are configured.
// Without them this is a no-op — safe for local dev and CI.
function makeLimiters(): Limiters | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  return {
    // Page visits: raised from 10→100 to handle carrier-grade NAT (many mobile users share one IP)
    page: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "24 h"),
      analytics: false,
      prefix: "voteassist:page",
    }),
    // Follow-up API calls: one per topic answer; generous to handle CGNAT, blocks mass abuse
    followUp: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(500, "24 h"),
      analytics: false,
      prefix: "voteassist:followup",
    }),
    // Score-topics API: called once per quiz completion; stricter because it's the heaviest call
    score: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "24 h"),
      analytics: false,
      prefix: "voteassist:score",
    }),
    // Results API: the 2nd Gemini call, fired once per quiz completion. Same cap
    // as score — it's an equally-expensive AI route that was previously uncapped.
    results: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "24 h"),
      analytics: false,
      prefix: "voteassist:results",
    }),
    // Export-pdf: spins up a headless browser (expensive) — called at most a
    // handful of times per session, so keep this tight.
    pdf: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "24 h"),
      analytics: false,
      prefix: "voteassist:pdf",
    }),
    // Feedback: unauthenticated POST that forwards to an internal Slack webhook.
    // Generous per-IP cap to stop notification flooding without blocking real use.
    feedback: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "24 h"),
      analytics: false,
      prefix: "voteassist:feedback",
    }),
  };
}

const limiters = makeLimiters();

// Every path that spends a metered/external resource (Gemini quota, headless
// browser, Slack webhook) MUST have a rule here — a missing entry means an
// uncapped public endpoint. Exported so tests can assert coverage; the matcher
// below is now broad (for CSP), so this list — not the matcher — is the guard.
export const RATE_LIMIT_RULES = [
  { path: "/prototype-e",      limiter: "page",     onLimit: "redirect" },
  { path: "/api/follow-up",    limiter: "followUp", onLimit: "errorCode" },
  { path: "/api/score-topics", limiter: "score",    onLimit: "errorCode" },
  { path: "/api/results",      limiter: "results",  onLimit: "errorCode" },
  { path: "/api/export-pdf",   limiter: "pdf",      onLimit: "error" },
  { path: "/api/feedback",     limiter: "feedback", onLimit: "error" },
] as const satisfies ReadonlyArray<{
  path: string;
  limiter: keyof Limiters;
  onLimit: "redirect" | "errorCode" | "error";
}>;

// Nonce-based Content-Security-Policy. 'strict-dynamic' + a per-request nonce is
// what lets us drop 'unsafe-inline' from script-src: Next stamps the nonce onto
// its own inline/hydration scripts, and any script those trusted scripts load is
// trusted transitively. The one hand-written inline script (Clarity, in
// app/layout.tsx) is nonced there too. Enforced in production only — dev keeps a
// relaxed policy so HMR/eval/websockets aren't blocked.
function buildCspHeader(nonce: string): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`, // inline style attributes (React style={{}}) are low-risk and impractical to nonce
    `img-src 'self' blob: data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://api-eu.mixpanel.com https://*.clarity.ms`,
    `worker-src 'self' blob:`, // Clarity session replay uses blob workers
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
    `report-uri /api/csp-report`,
    `upgrade-insecure-requests`,
  ];
  return directives.join("; ");
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ── Rate limiting (only when Upstash is configured) ──
  if (limiters) {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "anonymous";
    const rule = RATE_LIMIT_RULES.find((r) => r.path === path);
    if (rule) {
      const { success } = await limiters[rule.limiter].limit(ip);
      if (!success) {
        if (rule.onLimit === "redirect") return NextResponse.redirect(new URL("/rate-limited", req.url));
        if (rule.onLimit === "errorCode") return NextResponse.json({ errorCode: "RATE_LIMITED" }, { status: 429 });
        return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      }
    }
  }

  // API responses carry no HTML — rate-limited above, no CSP nonce needed.
  if (path.startsWith("/api/")) return NextResponse.next();

  // CSP is enforced in production only; the per-request nonce forces dynamic
  // rendering, so there's nothing to gain (and HMR to lose) applying it in dev.
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCspHeader(nonce);
  // Next reads the nonce from the CSP on the *request* headers to stamp its own
  // scripts; the browser enforces the copy on the *response* headers.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);
  return res;
}

// Broad matcher: middleware must run on every page response to inject the CSP
// nonce, plus the API routes above for rate limiting. Static assets and image
// optimization are excluded (no HTML, no metered resource).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
