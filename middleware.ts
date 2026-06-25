import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiter is only active when Upstash credentials are configured.
// Without them the middleware is a no-op — safe for local dev and CI.
function makeRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "24 h"),
    analytics: false,
    prefix: "voteassist",
  });
}

const ratelimit = makeRatelimit();

export async function middleware(req: NextRequest) {
  if (!ratelimit) return NextResponse.next();

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "anonymous";

  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.redirect(new URL("/rate-limited", req.url));
  }
  return NextResponse.next();
}

// Only count quiz entry-point visits, not every page navigation or API call.
export const config = {
  matcher: ["/prototype-e"],
};
