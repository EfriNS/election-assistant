import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { RATE_LIMIT_RULES } from "@/middleware";

// Regression guard for the 2026-07-07 security review: /api/results (a Gemini
// call) and /api/feedback (an internal Slack webhook) were reachable with NO
// rate limit — the same abuse class that got /api/chat deleted. The CSP work
// (2026-07-08) broadened the middleware matcher to all pages, so the matcher no
// longer lists the rate-limited routes; RATE_LIMIT_RULES is now the guard.
describe("middleware rate-limit coverage", () => {
  const rulePaths = RATE_LIMIT_RULES.map((r) => r.path);

  const RESOURCE_SPENDING_ROUTES = [
    "/api/follow-up",    // Gemini
    "/api/score-topics", // Gemini
    "/api/results",      // Gemini
    "/api/export-pdf",   // headless browser
    "/api/feedback",     // Slack webhook
  ];

  for (const route of RESOURCE_SPENDING_ROUTES) {
    it(`rate-limits ${route}`, () => {
      expect(rulePaths).toContain(route);
    });
  }

  it("every rule names a real limiter and a valid onLimit action", () => {
    const limiterKeys = ["page", "followUp", "score", "results", "pdf", "feedback"];
    const onLimitKinds = ["redirect", "errorCode", "error"];
    for (const rule of RATE_LIMIT_RULES) {
      expect(limiterKeys).toContain(rule.limiter);
      expect(onLimitKinds).toContain(rule.onLimit);
    }
  });

  // Regression guard: app/prototype-e was renamed to app/quiz (2026-06-30) but
  // its rule kept the old path, so the quiz page went unlimited for four months
  // while /prototype-e 404'd. A rule must point at a route that exists.
  for (const rule of RATE_LIMIT_RULES) {
    it(`rule path ${rule.path} matches a real route in app/`, () => {
      const dir = path.join(process.cwd(), "app", rule.path);
      const routeFile = rule.path.startsWith("/api/") ? "route.ts" : "page.tsx";
      expect(existsSync(path.join(dir, routeFile))).toBe(true);
    });
  }
});
