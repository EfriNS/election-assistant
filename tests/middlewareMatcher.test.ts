import { describe, it, expect } from "vitest";
import { config } from "@/middleware";

// Regression guard for the 2026-07-07 security review: /api/results (a Gemini
// call) and /api/feedback (an internal Slack webhook) were reachable with NO
// rate limit because they were missing from the matcher — the exact class of
// cost/abuse exposure that got /api/chat deleted in the prior review. Every
// route that spends a metered or external resource must be listed here.
describe("middleware rate-limit matcher", () => {
  const RESOURCE_SPENDING_ROUTES = [
    "/api/follow-up",   // Gemini
    "/api/score-topics", // Gemini
    "/api/results",     // Gemini
    "/api/export-pdf",  // headless browser
    "/api/feedback",    // Slack webhook
  ];

  for (const route of RESOURCE_SPENDING_ROUTES) {
    it(`covers ${route}`, () => {
      expect(config.matcher).toContain(route);
    });
  }
});
