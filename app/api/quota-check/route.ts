import { NextRequest, NextResponse } from "next/server";
import { LangfuseClient } from "@langfuse/client";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

// On the paid tier the daily request limit is so high that a percentage is
// noise; only surface it once it's worth noticing.
const HEADROOM_SHOWN_FROM_PCT = 10;

function getEnvInt(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v ? parseInt(v, 10) : NaN;
  return isNaN(n) ? fallback : n;
}

type RouteStats = { count: number; tokens: number; cost: number };
export type UsageTotals = { requests: number; tokens: number; cost: number; byRoute: Record<string, RouteStats> };
// Langfuse tags local `next dev` traffic "default"; anything that isn't the
// production deployment (dev, previews) is grouped as "other".
export type WindowUsage = { production: UsageTotals; other: UsageTotals };

// Quiz flow order: follow-up questions → scoring → results.
const ROUTE_ORDER = ["gemini-follow-up", "gemini-score-topics", "gemini-results"];

function emptyTotals(): UsageTotals {
  return { requests: 0, tokens: 0, cost: 0, byRoute: {} };
}

// Aggregates server-side via the Langfuse Metrics API: one request per window
// regardless of volume (paging raw observations would need ~1,500 requests at
// the paid-tier daily limit). Cost is Langfuse's own calculation from its model
// price table — an estimate, not the Google bill.
export async function fetchWindowUsage(
  client: LangfuseClient,
  fromTime: Date,
  toTime: Date
): Promise<WindowUsage> {
  const query = {
    view:       "observations",
    dimensions: [{ field: "environment" }, { field: "name" }],
    metrics:    [
      { measure: "count",       aggregation: "count" },
      { measure: "totalTokens", aggregation: "sum" },
      { measure: "totalCost",   aggregation: "sum" },
    ],
    filters:       [{ column: "type", operator: "=", value: "GENERATION", type: "string" }],
    fromTimestamp: fromTime.toISOString(),
    toTimestamp:   toTime.toISOString(),
  };
  const { data } = await client.api.metrics.metrics({ query: JSON.stringify(query) });

  const usage: WindowUsage = { production: emptyTotals(), other: emptyTotals() };
  for (const row of data) {
    const totals = row.environment === "production" ? usage.production : usage.other;
    // ClickHouse sums/counts come back as numeric strings.
    const stats: RouteStats = {
      count:  Number(row.count_count),
      tokens: Number(row.sum_totalTokens),
      cost:   Number(row.sum_totalCost),
    };
    const route = (totals.byRoute[String(row.name)] ??= { count: 0, tokens: 0, cost: 0 });
    route.count  += stats.count;
    route.tokens += stats.tokens;
    route.cost   += stats.cost;
    totals.requests += stats.count;
    totals.tokens   += stats.tokens;
    totals.cost     += stats.cost;
  }
  return usage;
}

export function computeRequestPct(requests: number, requestLimit: number): number {
  return requestLimit > 0 ? (requests / requestLimit) * 100 : 0;
}

export function formatCost(usd: number): string {
  return `$${usd.toFixed(usd < 1 ? 3 : 2)}`;
}

function routeRank(name: string): number {
  const i = ROUTE_ORDER.indexOf(name);
  return i === -1 ? ROUTE_ORDER.length : i;
}

export type DailySummary = {
  requestPct:    number;
  requestLimit:  number;
  today:         WindowUsage;
  previousDay:   WindowUsage;
  monthToDate:   WindowUsage;
};

export function buildSlackBody({ requestPct, requestLimit, today, previousDay, monthToDate }: DailySummary): object {
  const emoji = requestPct >= 90 ? "🚨" : requestPct >= 80 ? "⚠️" : requestPct >= 50 ? "📊" : "✅";
  const showHeadroom = requestPct >= HEADROOM_SHOWN_FROM_PCT;
  const prod  = today.production;
  const other = today.other;

  // One results generation per results page = one completed quiz (retries stay
  // inside the same generation).
  const quizzes         = prod.byRoute["gemini-results"]?.count ?? 0;
  const quizzesPrevious = previousDay.production.byRoute["gemini-results"]?.count ?? 0;
  const followUps       = prod.byRoute["gemini-follow-up"]?.count ?? 0;

  const routeLines = Object.entries(prod.byRoute)
    .sort((a, b) => routeRank(a[0]) - routeRank(b[0]))
    .map(([name, s]) => `  ${name}: ${s.count} call${s.count !== 1 ? "s" : ""}, ${s.tokens.toLocaleString()} tokens, ${formatCost(s.cost)}`)
    .join("\n");

  // The daily request limit is per API key, so headroom counts every environment.
  const allRequests = prod.requests + other.requests;

  return {
    text:
      `${emoji} Gemini daily usage — ${quizzes} quiz${quizzes !== 1 ? "zes" : ""}, ${formatCost(prod.cost)}` +
      (showHeadroom ? ` — ${requestPct.toFixed(0)}% of daily request limit` : ""),
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*${emoji} Gemini daily usage summary (last 24h, production)*\n` +
            `Completed quizzes: ${quizzes} (previous 24h: ${quizzesPrevious})\n` +
            `Follow-up questions generated: ${followUps}\n` +
            `Est. cost: ${formatCost(prod.cost)} · month to date: ${formatCost(monthToDate.production.cost)}\n` +
            `Requests: ${prod.requests.toLocaleString()} · tokens: ${prod.tokens.toLocaleString()}\n` +
            (other.requests > 0
              ? `Dev/other: ${other.requests.toLocaleString()} request${other.requests !== 1 ? "s" : ""}, ${formatCost(other.cost)} · month to date: ${formatCost(monthToDate.other.cost)}\n`
              : "") +
            (showHeadroom
              ? `Daily request limit: ${allRequests.toLocaleString()} / ${requestLimit.toLocaleString()} (${requestPct.toFixed(1)}%)\n`
              : "") +
            `Model: ${GEMINI_MODEL}`,
        },
      },
      ...(routeLines ? [{
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*By route (production):*\n\`\`\`${routeLines}\`\`\``,
        },
      }] : []),
    ],
  };
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.VERCEL) {
    // Fail closed in any deployed environment: without CRON_SECRET this endpoint
    // would be public, leaking usage metrics and letting anyone trigger the Slack
    // alert. Only local dev (no VERCEL env) may run it unauthenticated.
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    return NextResponse.json({ error: "Langfuse not configured" }, { status: 503 });
  }

  // Paid Tier 1 limits for gemini-3.1-flash-lite (billing enabled 2026-09-29):
  // RPM 4K, TPM 4M, RPD 150K. RPD is the only limit a once-a-day cron can measure.
  // FYI if we ever drop back to the free tier: RPD 500, RPM 10 — set
  // QUOTA_DAILY_REQUEST_LIMIT=500 in Vercel rather than changing this default.
  const requestLimit = getEnvInt("QUOTA_DAILY_REQUEST_LIMIT", 150_000);
  const webhookUrl   = process.env.QUOTA_SLACK_WEBHOOK_URL;

  const client = new LangfuseClient({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey:  process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl:   process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  });

  const DAY_MS      = 24 * 60 * 60 * 1000;
  const now         = new Date();
  const windowStart = new Date(now.getTime() - DAY_MS);
  const monthStart  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [today, previousDay, monthToDate] = await Promise.all([
    fetchWindowUsage(client, windowStart, now),
    fetchWindowUsage(client, new Date(windowStart.getTime() - DAY_MS), windowStart),
    fetchWindowUsage(client, monthStart, now),
  ]);
  const requestPct = computeRequestPct(today.production.requests + today.other.requests, requestLimit);

  let slackSent = false;
  if (webhookUrl) {
    const body = buildSlackBody({ requestPct, requestLimit, today, previousDay, monthToDate });
    await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    slackSent = true;
  }

  return NextResponse.json({
    today:           today,
    costMonthToDate: { production: monthToDate.production.cost, other: monthToDate.other.cost },
    requestPct:      Math.round(requestPct * 10) / 10,
    slackSent,
  });
}
