import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  computeRequestPct,
  buildSlackBody,
  fetchWindowUsage,
  formatCost,
  type DailySummary,
  type UsageTotals,
  type WindowUsage,
} from "@/app/api/quota-check/route";
import { NextRequest } from "next/server";

// ─── Mock Langfuse ────────────────────────────────────────────────────────────

const { mockMetrics } = vi.hoisted(() => ({
  mockMetrics: vi.fn(),
}));

vi.mock("@langfuse/client", () => ({
  LangfuseClient: vi.fn(function() {
    return { api: { metrics: { metrics: mockMetrics } } };
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Mirrors the real Metrics API row shape: counts/sums as numeric strings.
function makeRow(name: string, count: number, tokens: number, cost: number, environment = "production") {
  return { environment, name, count_count: String(count), sum_totalTokens: String(tokens), sum_totalCost: cost };
}

function makeReq(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/quota-check", {
    method: "GET",
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

function stubRows(rows: ReturnType<typeof makeRow>[]) {
  mockMetrics.mockResolvedValue({ data: rows });
}

function queriedWindows(): { from: string; to: string }[] {
  return mockMetrics.mock.calls.map(([req]) => {
    const q = JSON.parse(req.query);
    return { from: q.fromTimestamp, to: q.toTimestamp };
  });
}

const emptyTotals: UsageTotals = { requests: 0, tokens: 0, cost: 0, byRoute: {} };
const emptyWindow: WindowUsage = { production: emptyTotals, other: emptyTotals };

function prodOnly(totals: UsageTotals): WindowUsage {
  return { production: totals, other: emptyTotals };
}

function summary(overrides: Partial<DailySummary> = {}): DailySummary {
  return {
    requestPct:   0,
    requestLimit: 150_000,
    today:        emptyWindow,
    previousDay:  emptyWindow,
    monthToDate:  emptyWindow,
    ...overrides,
  };
}

function totalsWith(byRoute: UsageTotals["byRoute"]): UsageTotals {
  const all = Object.values(byRoute);
  return {
    requests: all.reduce((n, s) => n + s.count, 0),
    tokens:   all.reduce((n, s) => n + s.tokens, 0),
    cost:     all.reduce((n, s) => n + s.cost, 0),
    byRoute,
  };
}

// ─── Unit: pure helpers ───────────────────────────────────────────────────────

describe("fetchWindowUsage", () => {
  beforeEach(() => mockMetrics.mockReset());

  it("aggregates per-route Metrics API rows, converting numeric strings", async () => {
    stubRows([
      makeRow("gemini-follow-up",    42, 201_938, 0.0679),
      makeRow("gemini-score-topics",  5,  91_908, 0.0283),
    ]);
    const { LangfuseClient } = await import("@langfuse/client");
    const { production: totals } = await fetchWindowUsage(new LangfuseClient(), new Date(0), new Date());
    expect(totals.requests).toBe(47);
    expect(totals.tokens).toBe(293_846);
    expect(totals.cost).toBeCloseTo(0.0962);
    expect(totals.byRoute["gemini-follow-up"]).toEqual({ count: 42, tokens: 201_938, cost: 0.0679 });
  });

  it("splits production from every other environment (dev, previews)", async () => {
    stubRows([
      makeRow("gemini-results",      1, 2_484, 0.0012),
      makeRow("gemini-results",      2, 4_947, 0.0023, "default"),
      makeRow("gemini-score-topics", 1, 4_539, 0.0013, "default"),
      makeRow("gemini-results",      1, 2_000, 0.0010, "preview"),
    ]);
    const { LangfuseClient } = await import("@langfuse/client");
    const usage = await fetchWindowUsage(new LangfuseClient(), new Date(0), new Date());
    expect(usage.production.requests).toBe(1);
    expect(usage.production.byRoute["gemini-results"].count).toBe(1);
    expect(usage.other.requests).toBe(4);
    expect(usage.other.cost).toBeCloseTo(0.0046);
    // Same route from two non-production environments merges into one entry.
    expect(usage.other.byRoute["gemini-results"]).toEqual({ count: 3, tokens: 6_947, cost: 0.0033 });
  });

  it("queries only GENERATION observations, grouped by environment and name", async () => {
    stubRows([]);
    const { LangfuseClient } = await import("@langfuse/client");
    await fetchWindowUsage(new LangfuseClient(), new Date(0), new Date());
    const q = JSON.parse(mockMetrics.mock.calls[0][0].query);
    expect(q.view).toBe("observations");
    expect(q.dimensions).toEqual([{ field: "environment" }, { field: "name" }]);
    expect(q.filters).toContainEqual(expect.objectContaining({ column: "type", value: "GENERATION" }));
  });
});

describe("computeRequestPct", () => {
  it("calculates request percentage", () => {
    expect(computeRequestPct(250, 500)).toBeCloseTo(50);
  });

  it("returns 0 when limit is 0 (avoids division by zero)", () => {
    expect(computeRequestPct(10, 0)).toBe(0);
  });

  it("can exceed 100% when over limit", () => {
    expect(computeRequestPct(600, 500)).toBeCloseTo(120);
  });
});

describe("formatCost", () => {
  it("keeps 3 decimals under $1 so cent-level daily costs stay visible", () => {
    expect(formatCost(0.01218)).toBe("$0.012");
  });

  it("uses 2 decimals from $1 up", () => {
    expect(formatCost(12.345)).toBe("$12.35");
  });
});

describe("buildSlackBody", () => {
  it("uses 🚨 emoji at 90%+", () => {
    expect(JSON.stringify(buildSlackBody(summary({ requestPct: 91 })))).toContain("🚨");
  });

  it("uses ⚠️ emoji at 80%", () => {
    expect(JSON.stringify(buildSlackBody(summary({ requestPct: 80 })))).toContain("⚠️");
  });

  it("uses 📊 emoji at 50%", () => {
    expect(JSON.stringify(buildSlackBody(summary({ requestPct: 50 })))).toContain("📊");
  });

  it("uses ✅ emoji below 50%", () => {
    expect(JSON.stringify(buildSlackBody(summary({ requestPct: 20 })))).toContain("✅");
  });

  it("hides the request-limit percentage below 10% (paid-tier noise)", () => {
    const today = prodOnly(totalsWith({ "gemini-results": { count: 16, tokens: 40_000, cost: 0.02 } }));
    const body = JSON.stringify(buildSlackBody(summary({ requestPct: 0.01, today })));
    expect(body).not.toContain("150,000");
    expect(body).not.toContain("request limit");
    expect(body).not.toContain("%");
  });

  it("shows the request-limit headroom from 10%, counting every environment (limit is per API key)", () => {
    const today = { production: { ...emptyTotals, requests: 14_000 }, other: { ...emptyTotals, requests: 1_000 } };
    const body = JSON.stringify(buildSlackBody(summary({ requestPct: 10, today })));
    expect(body).toContain("15,000 / 150,000 (10.0%)");
    expect(body).toContain("10% of daily request limit");
  });

  it("reports completed quizzes (results calls) against the previous 24h", () => {
    const today       = prodOnly(totalsWith({ "gemini-results": { count: 5, tokens: 12_000, cost: 0.006 } }));
    const previousDay = prodOnly(totalsWith({ "gemini-results": { count: 2, tokens:  5_000, cost: 0.002 } }));
    const body = JSON.stringify(buildSlackBody(summary({ today, previousDay })));
    expect(body).toContain("Completed quizzes: 5 (previous 24h: 2)");
  });

  it("reports zero quizzes when no results calls happened", () => {
    const today = prodOnly(totalsWith({ "gemini-follow-up": { count: 3, tokens: 9_000, cost: 0.003 } }));
    const body = JSON.stringify(buildSlackBody(summary({ today })));
    expect(body).toContain("Completed quizzes: 0 (previous 24h: 0)");
    expect(body).toContain("Follow-up questions generated: 3");
  });

  it("includes today's and month-to-date estimated cost", () => {
    const today       = prodOnly({ ...emptyTotals, cost: 0.0421 });
    const monthToDate = prodOnly({ ...emptyTotals, cost: 0.187 });
    const body = JSON.stringify(buildSlackBody(summary({ today, monthToDate })));
    expect(body).toContain("Est. cost: $0.042 · month to date: $0.187");
  });

  it("includes per-route breakdown with cost when byRoute is populated", () => {
    const today = prodOnly(totalsWith({
      "gemini-follow-up":    { count: 1, tokens:  2_375, cost: 0.0008 },
      "gemini-score-topics": { count: 1, tokens: 21_005, cost: 0.0071 },
    }));
    const body = JSON.stringify(buildSlackBody(summary({ today })));
    expect(body).toContain("gemini-follow-up: 1 call, 2,375 tokens, $0.001");
    expect(body).toContain("gemini-score-topics: 1 call, 21,005 tokens, $0.007");
  });

  it("orders routes by the quiz flow, not by tokens, with unknown routes last", () => {
    const today = prodOnly(totalsWith({
      "gemini-new-route":    { count: 1, tokens: 90_000, cost: 0.03 },
      "gemini-results":      { count: 1, tokens:  2_000, cost: 0.001 },
      "gemini-score-topics": { count: 1, tokens: 30_000, cost: 0.009 },
      "gemini-follow-up":    { count: 9, tokens: 40_000, cost: 0.012 },
    }));
    const body = buildSlackBody(summary({ today })) as { blocks: { text: { text: string } }[] };
    const order = [...body.blocks[1].text.text.matchAll(/gemini-[a-z-]+/g)].map((m) => m[0]);
    expect(order).toEqual(["gemini-follow-up", "gemini-score-topics", "gemini-results", "gemini-new-route"]);
  });

  it("reports production only in the main numbers and route breakdown", () => {
    const today: WindowUsage = {
      production: totalsWith({ "gemini-results": { count: 1, tokens: 2_484, cost: 0.0012 } }),
      other:      totalsWith({ "gemini-results": { count: 2, tokens: 4_947, cost: 0.0023 } }),
    };
    const body = JSON.stringify(buildSlackBody(summary({ today })));
    expect(body).toContain("Completed quizzes: 1");
    expect(body).toContain("Requests: 1 ·");
    expect(body).toContain("gemini-results: 1 call, 2,484 tokens");
  });

  it("shows a Dev/other line with today's and month-to-date cost when non-production calls happened", () => {
    const today       = { production: emptyTotals, other: { ...emptyTotals, requests: 3, cost: 0.0036 } };
    const monthToDate = { production: emptyTotals, other: { ...emptyTotals, requests: 3, cost: 0.0136 } };
    const body = JSON.stringify(buildSlackBody(summary({ today, monthToDate })));
    expect(body).toContain("Dev/other: 3 requests, $0.004 · month to date: $0.014");
  });

  it("hides the Dev/other line on days without non-production calls", () => {
    const monthToDate = { production: emptyTotals, other: { ...emptyTotals, requests: 3, cost: 0.0136 } };
    const body = JSON.stringify(buildSlackBody(summary({ monthToDate })));
    expect(body).not.toContain("Dev/other");
  });

  it("omits route breakdown block when byRoute is empty", () => {
    const body = buildSlackBody(summary()) as { blocks: unknown[] };
    expect(body.blocks).toHaveLength(1);
  });
});

// ─── Integration: GET /api/quota-check ───────────────────────────────────────

describe("GET /api/quota-check", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      LANGFUSE_SECRET_KEY:         "test-secret",
      LANGFUSE_PUBLIC_KEY:          "test-public",
      QUOTA_DAILY_REQUEST_LIMIT:   "500",
      CRON_SECRET:                  undefined,
      QUOTA_SLACK_WEBHOOK_URL:      undefined,
      VERCEL:                       undefined, // default to "local dev" unless a test opts in
    };
    mockMetrics.mockReset();
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns 401 when secret is set but auth header is missing", async () => {
    process.env.CRON_SECRET = "my-secret";
    const { GET } = await import("@/app/api/quota-check/route");
    stubRows([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 401 when secret is set and auth header is wrong", async () => {
    process.env.CRON_SECRET = "my-secret";
    const { GET } = await import("@/app/api/quota-check/route");
    stubRows([]);
    const res = await GET(makeReq("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with correct secret", async () => {
    process.env.CRON_SECRET = "my-secret";
    const { GET } = await import("@/app/api/quota-check/route");
    stubRows([]);
    const res = await GET(makeReq("my-secret"));
    expect(res.status).toBe(200);
  });

  it("fails closed (503) when CRON_SECRET is unset in a deployed (VERCEL) environment", async () => {
    // Regression test (2026-07-07 security review): a missing CRON_SECRET in prod
    // used to leave this endpoint fully public — leaking usage metrics and letting
    // anyone trigger the Slack alert.
    process.env.VERCEL = "1";
    const { GET } = await import("@/app/api/quota-check/route");
    stubRows([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(503);
  });

  it("allows unauthenticated access in local dev (no VERCEL) when CRON_SECRET is unset", async () => {
    // VERCEL is unset by beforeEach — local manual testing must still work.
    const { GET } = await import("@/app/api/quota-check/route");
    stubRows([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });

  it("returns 503 when Langfuse is not configured", async () => {
    delete process.env.LANGFUSE_SECRET_KEY;
    const { GET } = await import("@/app/api/quota-check/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(503);
  });

  it("queries a rolling 24h window ending now, not since UTC midnight", async () => {
    // Regression test: the window used to be [UTC midnight, now], which on a
    // daily cron fired shortly after UTC midnight collapses to a near-empty
    // few-hour slice that misses almost all real usage (see CHANGELOG).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T02:00:00.000Z")); // 2h after UTC midnight

    const { GET } = await import("@/app/api/quota-check/route");
    stubRows([]);
    await GET(makeReq());

    expect(queriedWindows()).toContainEqual({
      from: "2026-07-02T02:00:00.000Z",
      to:   "2026-07-03T02:00:00.000Z",
    });

    vi.useRealTimers();
  });

  it("also queries the previous 24h and month-to-date (UTC) windows", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T06:00:00.000Z"));

    const { GET } = await import("@/app/api/quota-check/route");
    stubRows([]);
    await GET(makeReq());

    const windows = queriedWindows();
    expect(windows).toHaveLength(3);
    expect(windows).toContainEqual({ from: "2026-09-30T06:00:00.000Z", to: "2026-10-01T06:00:00.000Z" });
    expect(windows).toContainEqual({ from: "2026-10-01T00:00:00.000Z", to: "2026-10-02T06:00:00.000Z" });

    vi.useRealTimers();
  });

  it("returns per-environment usage, cost, and per-route breakdown", async () => {
    const { GET } = await import("@/app/api/quota-check/route");
    stubRows([
      makeRow("gemini-follow-up",    2, 13_500, 0.004),
      makeRow("gemini-score-topics", 1, 19_000, 0.006),
      makeRow("gemini-results",      2,  5_000, 0.002, "default"),
    ]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.today.production.requests).toBe(3);
    expect(body.today.production.tokens).toBe(32_500);
    expect(body.today.production.cost).toBeCloseTo(0.01);
    expect(body.today.production.byRoute["gemini-follow-up"].count).toBe(2);
    expect(body.today.other.requests).toBe(2);
    expect(body.costMonthToDate.production).toBeCloseTo(0.01);
    expect(body.costMonthToDate.other).toBeCloseTo(0.002);
    expect(body.requestPct).toBeCloseTo(1, 1); // (3 prod + 2 dev) / 500
    expect(body.slackSent).toBe(false);
  });

  it("always sends Slack summary when webhook is configured", async () => {
    process.env.QUOTA_SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", mockFetch);

    const { GET } = await import("@/app/api/quota-check/route");
    stubRows([makeRow("gemini-results", 1, 5_000, 0.001)]);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.slackSent).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({ method: "POST" })
    );
    vi.unstubAllGlobals();
  });

  it("sends 🚨 emoji in Slack message when above 90% of request limit", async () => {
    process.env.QUOTA_SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    process.env.QUOTA_DAILY_REQUEST_LIMIT = "10"; // low limit so 10 requests = 100% → 🚨
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", mockFetch);

    const { GET } = await import("@/app/api/quota-check/route");
    stubRows([makeRow("gemini-follow-up", 10, 1_000, 0.001)]);

    await GET(makeReq());
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(JSON.stringify(callBody)).toContain("🚨");
    vi.unstubAllGlobals();
  });
});
