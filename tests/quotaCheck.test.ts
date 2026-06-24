import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  computePcts,
  newlyCrossedThresholds,
  buildSlackBody,
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

function makeObs(inputTokens: number, outputTokens: number) {
  return { usage: { input: inputTokens, output: outputTokens } };
}

function makeReq(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/quota-check", {
    method: "GET",
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

// Helper: configure fetchObservations to return `obs` for all calls
function stubObservations(obs: ReturnType<typeof makeObs>[]) {
  mockFetchObservations.mockResolvedValue({ data: obs });
}

// ─── Unit: pure helpers ───────────────────────────────────────────────────────

describe("computePcts", () => {
  it("calculates token and request percentages", () => {
    const { tokenPct, requestPct, overallPct } = computePcts(
      { tokens: 125_000, requests: 750 },
      250_000,
      1_500
    );
    expect(tokenPct).toBeCloseTo(50);
    expect(requestPct).toBeCloseTo(50);
    expect(overallPct).toBeCloseTo(50);
  });

  it("returns overall as the higher of the two percentages", () => {
    const { overallPct } = computePcts({ tokens: 10_000, requests: 1_200 }, 250_000, 1_500);
    expect(overallPct).toBeCloseTo(80); // requestPct = 80%, tokenPct = 4%
  });

  it("returns 0 when limits are 0 (avoids division by zero)", () => {
    const { tokenPct } = computePcts({ tokens: 100, requests: 10 }, 0, 100);
    expect(tokenPct).toBe(0);
  });
});

describe("newlyCrossedThresholds", () => {
  const thresholds = [50, 80, 90];

  it("returns thresholds crossed since the previous window", () => {
    expect(newlyCrossedThresholds(85, 45, thresholds)).toEqual([50, 80]);
  });

  it("returns empty array when already above threshold (de-duplication)", () => {
    expect(newlyCrossedThresholds(85, 82, thresholds)).toEqual([]);
  });

  it("returns 90% threshold when crossing from 89 to 91", () => {
    expect(newlyCrossedThresholds(91, 89, thresholds)).toEqual([90]);
  });

  it("returns empty array when below all thresholds", () => {
    expect(newlyCrossedThresholds(40, 30, thresholds)).toEqual([]);
  });
});

describe("buildSlackBody", () => {
  it("uses 🚨 emoji at 90%+", () => {
    const body = buildSlackBody(91, 91, 250_000, 1_500, { tokens: 227_500, requests: 1_365 }, [90]);
    expect(JSON.stringify(body)).toContain("🚨");
  });

  it("uses ⚠️ emoji at 80%", () => {
    const body = buildSlackBody(80, 80, 250_000, 1_500, { tokens: 200_000, requests: 1_200 }, [80]);
    expect(JSON.stringify(body)).toContain("⚠️");
  });

  it("uses 📊 emoji at 50%", () => {
    const body = buildSlackBody(50, 50, 250_000, 1_500, { tokens: 125_000, requests: 750 }, [50]);
    expect(JSON.stringify(body)).toContain("📊");
  });

  it("includes token and request counts in message", () => {
    const body = JSON.stringify(
      buildSlackBody(50, 50, 250_000, 1_500, { tokens: 125_000, requests: 750 }, [50])
    );
    expect(body).toContain("125,000");
    expect(body).toContain("250,000");
    expect(body).toContain("750");
    expect(body).toContain("1,500");
  });
});

// ─── Integration: GET /api/quota-check ───────────────────────────────────────

describe("GET /api/quota-check", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      LANGFUSE_SECRET_KEY: "test-secret",
      LANGFUSE_PUBLIC_KEY:  "test-public",
      QUOTA_DAILY_TOKEN_LIMIT:   "250000",
      QUOTA_DAILY_REQUEST_LIMIT: "1500",
      QUOTA_ALERT_THRESHOLDS: "50,80,90",
      QUOTA_CRON_SECRET: undefined,
      QUOTA_SLACK_WEBHOOK_URL: undefined,
    };
    mockFetchObservations.mockReset();
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns 401 when secret is set but auth header is missing", async () => {
    process.env.QUOTA_CRON_SECRET = "my-secret";
    const { GET } = await import("@/app/api/quota-check/route");
    stubObservations([]);
    const res = await GET(makeReq()); // no header
    expect(res.status).toBe(401);
  });

  it("returns 401 when secret is set and auth header is wrong", async () => {
    process.env.QUOTA_CRON_SECRET = "my-secret";
    const { GET } = await import("@/app/api/quota-check/route");
    stubObservations([]);
    const res = await GET(makeReq("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with correct secret", async () => {
    process.env.QUOTA_CRON_SECRET = "my-secret";
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

  it("returns correct usage percentages from observations", async () => {
    const { GET } = await import("@/app/api/quota-check/route");
    // current window: 125K tokens (50%), 750 requests (50%)
    // previous window (1hr ago): same, called second
    stubObservations(
      Array.from({ length: 5 }, () => makeObs(12_500, 12_500))  // 5 * 25K = 125K tokens
    );
    const res = await GET(makeReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.tokensToday).toBe(125_000);
    expect(body.requestsToday).toBe(5);
    expect(body.tokenPct).toBeCloseTo(50, 0);
    expect(body.alertSent).toBe(false); // no webhook configured
  });

  it("fires Slack alert when threshold first crossed", async () => {
    process.env.QUOTA_SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";

    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", mockFetch);

    const { GET } = await import("@/app/api/quota-check/route");

    // current: 85% (above 80% threshold); previous: 40% (below 80%)
    mockFetchObservations
      .mockResolvedValueOnce({ data: [makeObs(212_500, 0)] }) // current: 85% tokens
      .mockResolvedValueOnce({ data: [makeObs(100_000, 0)] }); // prev: 40%

    const res = await GET(makeReq());
    const body = await res.json();

    expect(body.thresholdsCrossed).toContain(80);
    expect(body.alertSent).toBe(true);
    // Slack webhook called with correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({ method: "POST" })
    );

    vi.unstubAllGlobals();
  });

  it("does NOT fire Slack alert when already above threshold (de-duplication)", async () => {
    process.env.QUOTA_SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";

    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", mockFetch);

    const { GET } = await import("@/app/api/quota-check/route");

    // both current and previous are above 80% → already alerted this hour
    mockFetchObservations
      .mockResolvedValueOnce({ data: [makeObs(220_000, 0)] }) // current: 88%
      .mockResolvedValueOnce({ data: [makeObs(210_000, 0)] }); // prev: 84%

    const res = await GET(makeReq());
    const body = await res.json();

    expect(body.thresholdsCrossed).toEqual([]);
    expect(body.alertSent).toBe(false);
    // Slack webhook NOT called
    expect(mockFetch).not.toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.anything()
    );

    vi.unstubAllGlobals();
  });
});
