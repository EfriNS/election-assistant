import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Limiters = {
  page: Ratelimit;
  followUp: Ratelimit;
  score: Ratelimit;
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
  };
}

const limiters = makeLimiters();

export async function middleware(req: NextRequest) {
  if (!limiters) return NextResponse.next();

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "anonymous";
  const path = req.nextUrl.pathname;

  if (path === "/prototype-e") {
    const { success } = await limiters.page.limit(ip);
    if (!success) return NextResponse.redirect(new URL("/rate-limited", req.url));
  } else if (path === "/api/follow-up") {
    const { success } = await limiters.followUp.limit(ip);
    if (!success) return NextResponse.json({ errorCode: "RATE_LIMITED" }, { status: 429 });
  } else if (path === "/api/score-topics") {
    const { success } = await limiters.score.limit(ip);
    if (!success) return NextResponse.json({ errorCode: "RATE_LIMITED" }, { status: 429 });
  }

  return NextResponse.next();
}

// Rate-limit the quiz page and the two AI-calling API routes.
export const config = {
  matcher: ["/prototype-e", "/api/follow-up", "/api/score-topics"],
};
