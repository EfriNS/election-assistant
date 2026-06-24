import { NextRequest, NextResponse } from "next/server";
import { Langfuse } from "langfuse";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

function getEnvInt(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v ? parseInt(v, 10) : NaN;
  return isNaN(n) ? fallback : n;
}

function parseThresholds(): number[] {
  return (process.env.QUOTA_ALERT_THRESHOLDS ?? "50,80,90")
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);
}

type UsageTotals = { tokens: number; requests: number };

export async function fetchWindowUsage(
  client: Langfuse,
  fromTime: Date,
  toTime: Date
): Promise<UsageTotals> {
  let tokens = 0;
  let requests = 0;
  let page = 1;
  const limit = 100;

  while (true) {
    const result = await client.fetchObservations({
      fromStartTime: fromTime,
      toStartTime:   toTime,
      type:          "GENERATION",
      page,
      limit,
    });

    for (const obs of result.data) {
      tokens += (obs.usage?.input ?? 0) + (obs.usage?.output ?? 0);
      requests++;
    }

    if (result.data.length < limit) break;
    page++;
  }

  return { tokens, requests };
}

export function computePcts(
  totals: UsageTotals,
  tokenLimit: number,
  requestLimit: number
): { tokenPct: number; requestPct: number; overallPct: number } {
  const tokenPct   = tokenLimit   > 0 ? (totals.tokens   / tokenLimit)   * 100 : 0;
  const requestPct = requestLimit > 0 ? (totals.requests / requestLimit) * 100 : 0;
  return { tokenPct, requestPct, overallPct: Math.max(tokenPct, requestPct) };
}

export function newlyCrossedThresholds(
  currentPct: number,
  previousPct: number,
  thresholds: number[]
): number[] {
  return thresholds.filter((t) => currentPct >= t && previousPct < t);
}

export function buildSlackBody(
  tokenPct: number,
  requestPct: number,
  tokenLimit: number,
  requestLimit: number,
  totals: UsageTotals,
  crossed: number[]
): object {
  const level   = crossed[crossed.length - 1];
  const emoji   = level >= 90 ? "🚨" : level >= 80 ? "⚠️" : "📊";
  const overall = Math.max(tokenPct, requestPct).toFixed(0);
  const binding = tokenPct >= requestPct ? "tokens" : "requests";

  return {
    text: `${emoji} Gemini quota alert — ${overall}% of daily limit`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*${emoji} Gemini quota alert — ${overall}% of daily limit*\n` +
            `Tokens: ${totals.tokens.toLocaleString()} / ${tokenLimit.toLocaleString()} (${tokenPct.toFixed(1)}%)\n` +
            `Requests: ${totals.requests.toLocaleString()} / ${requestLimit.toLocaleString()} (${requestPct.toFixed(1)}%)\n` +
            `Binding: ${binding}\n` +
            `Model: ${GEMINI_MODEL}`,
        },
      },
    ],
  };
}

export async function GET(req: NextRequest) {
  // Auth: only required when QUOTA_CRON_SECRET is configured
  const cronSecret = process.env.QUOTA_CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    return NextResponse.json({ error: "Langfuse not configured" }, { status: 503 });
  }

  const tokenLimit   = getEnvInt("QUOTA_DAILY_TOKEN_LIMIT",   250_000);
  const requestLimit = getEnvInt("QUOTA_DAILY_REQUEST_LIMIT", 1_500);
  const thresholds   = parseThresholds();
  const webhookUrl   = process.env.QUOTA_SLACK_WEBHOOK_URL;

  const client = new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey:  process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl:   process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  });

  const now        = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [current, previous] = await Promise.all([
    fetchWindowUsage(client, todayStart, now),
    fetchWindowUsage(client, todayStart, oneHourAgo),
  ]);

  const { tokenPct, requestPct, overallPct } = computePcts(current, tokenLimit, requestLimit);
  const { overallPct: prevOverallPct }        = computePcts(previous, tokenLimit, requestLimit);

  const crossed   = newlyCrossedThresholds(overallPct, prevOverallPct, thresholds);
  let   alertSent = false;

  if (crossed.length > 0 && webhookUrl) {
    const body = buildSlackBody(tokenPct, requestPct, tokenLimit, requestLimit, current, crossed);
    await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    alertSent = true;
  }

  return NextResponse.json({
    tokensToday:       current.tokens,
    requestsToday:     current.requests,
    tokenPct:          Math.round(tokenPct   * 10) / 10,
    requestPct:        Math.round(requestPct * 10) / 10,
    overallPct:        Math.round(overallPct * 10) / 10,
    thresholdsCrossed: crossed,
    alertSent,
  });
}
