import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  computeRequestPct,
  buildSlackBody,
  type UsageTotals,
} from "@/app/api/quota-check/route";
import { NextRequest } from "next/server";

// ─── Mock Langfuse ────────────────────────────────────────────────────────────

const { mockFetchObservations } = vi.hoisted(() => ({
  mockFetchObservations: vi.fn(),
}));

vi.mock("langfuse", () => ({
  Langfuse: vi.fn(function() {
    return { fetchObservations: mockFetchObservations };
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeObs(inputTokens: number, outputTokens: number, name = "gemini-chat") {
  return { name, usage: { input: inputTokens, output: outputTokens } };
}

function makeReq(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/quota-check", {
    method: "GET",
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

function stubObservations(obs: ReturnType<typeof makeObs>[]) {
  mockFetchObservations.mockResolvedValue({ data: obs });
}

const emptyTotals: UsageTotals = { tokens: 0, requests: 0, byRoute: {} };

// ─── Unit: pure helpers ───────────────────────────────────────────────────────

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

describe("buildSlackBody", () => {
  it("uses 🚨 emoji at 90%+", () => {
    const body = buildSlackBody(91, 500, { ...emptyTotals, requests: 455 });
    expect(JSON.stringify(body)).toContain("🚨");
  });

  it("uses ⚠️ emoji at 80%", () => {
    const body = buildSlackBody(80, 500, { ...emptyTotals, requests: 400 });
    expect(JSON.stringify(body)).toContain("⚠️");
  });

  it("uses 📊 emoji at 50%", () => {
    const body = buildSlackBody(50, 500, { ...emptyTotals, requests: 250 });
    expect(JSON.stringify(body)).toContain("📊");
  });

  it("uses ✅ emoji below 50%", () => {
    const body = buildSlackBody(20, 500, { ...emptyTotals, requests: 100 });
    expect(JSON.stringify(body)).toContain("✅");
  });

  it("includes request and token counts in message", () => {
    const totals: UsageTotals = { tokens: 49_870, requests: 11, byRoute: {} };
    const body = JSON.stringify(buildSlackBody(2.2, 500, totals));
    expect(body).toContain("11");
    expect(body).toContain("500");
    expect(body).toContain("49,870");
  });

  it("includes per-route breakdown when byRoute is populated", () => {
    const totals: UsageTotals = {
      tokens: 23_380,
      requests: 2,
      byRoute: {
        "gemini-follow-up":    { count: 1, tokens: 2_375 },
        "gemini-score-topics": { count: 1, tokens: 21_005 },
      },
    };
    const body = JSON.stringify(buildSlackBody(0.4, 500, totals));
    expect(body).toContain("gemini-follow-up");
    expect(body).toContain("gemini-score-topics");
    expect(body).toContain("21,005");
  });

  it("omits route breakdown block when byRoute is empty", () => {
    const body = buildSlackBody(2, 500, emptyTotals) as { blocks: unknown[] };
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
    };
    mockFetchObservations.mockReset();
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns 401 when secret is set but auth header is missing", async () => {
    process.env.CRON_SECRET = "my-secret";
    const { GET } = await import("@/app/api/quota-check/route");
    stubObservations([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 401 when secret is set and auth header is wrong", async () => {
    process.env.CRON_SECRET = "my-secret";
    const { GET } = await import("@/app/api/quota-check/route");
    stubObservations([]);
    const res = await GET(makeReq("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with correct secret", async () => {
    process.env.CRON_SECRET = "my-secret";
    const { GET } = await import("@/app/api/quota-check/route");
    stubObservations([]);
    const res = await GET(makeReq("my-secret"));
    expect(res.status).toBe(200);
  });

  it("returns 503 when Langfuse is not configured", async () => {
    delete process.env.LANGFUSE_SECRET_KEY;
    const { GET } = await import("@/app/api/quota-check/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(503);
  });

  it("returns correct usage counts and per-route breakdown", async () => {
    const { GET } = await import("@/app/api/quota-check/route");
    stubObservations([
      makeObs(10_000, 2_000, "gemini-follow-up"),
      makeObs(15_000, 4_000, "gemini-score-topics"),
      makeObs(1_000,  500,   "gemini-follow-up"),
    ]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.requestsToday).toBe(3);
    expect(body.tokensToday).toBe(32_500);
    expect(body.requestPct).toBeCloseTo(0.6, 0); // 3/500
    expect(body.byRoute["gemini-follow-up"].count).toBe(2);
    expect(body.byRoute["gemini-score-topics"].count).toBe(1);
    expect(body.slackSent).toBe(false);
  });

  it("always sends Slack summary when webhook is configured", async () => {
    process.env.QUOTA_SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", mockFetch);

    const { GET } = await import("@/app/api/quota-check/route");
    stubObservations([makeObs(5_000, 0, "gemini-results")]);

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
    process.env.QUOTA_DAILY_REQUEST_LIMIT = "10"; // low limit so 10 obs = 100% → 🚨
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", mockFetch);

    const { GET } = await import("@/app/api/quota-check/route");
    stubObservations(Array.from({ length: 10 }, () => makeObs(100, 0)));

    await GET(makeReq());
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(JSON.stringify(callBody)).toContain("🚨");
    vi.unstubAllGlobals();
  });
});
