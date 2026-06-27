import { NextRequest, NextResponse } from "next/server";
import { Langfuse } from "langfuse";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

function getEnvInt(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v ? parseInt(v, 10) : NaN;
  return isNaN(n) ? fallback : n;
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

export function buildSlackBody(
  tokenPct: number,
  requestPct: number,
  tokenLimit: number,
  requestLimit: number,
  totals: UsageTotals,
  overallPct: number
): object {
  const emoji   = overallPct >= 90 ? "🚨" : overallPct >= 80 ? "⚠️" : overallPct >= 50 ? "📊" : "✅";
  const overall = overallPct.toFixed(0);
  const binding = tokenPct >= requestPct ? "tokens" : "requests";

  return {
    text: `${emoji} Gemini daily usage — ${overall}% of limit`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*${emoji} Gemini daily usage summary*\n` +
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
  const webhookUrl   = process.env.QUOTA_SLACK_WEBHOOK_URL;

  const client = new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey:  process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl:   process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  });

  const now        = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const totals = await fetchWindowUsage(client, todayStart, now);
  const { tokenPct, requestPct, overallPct } = computePcts(totals, tokenLimit, requestLimit);

  let slackSent = false;
  if (webhookUrl) {
    const body = buildSlackBody(tokenPct, requestPct, tokenLimit, requestLimit, totals, overallPct);
    await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    slackSent = true;
  }

  return NextResponse.json({
    tokensToday:   totals.tokens,
    requestsToday: totals.requests,
    tokenPct:      Math.round(tokenPct   * 10) / 10,
    requestPct:    Math.round(requestPct * 10) / 10,
    overallPct:    Math.round(overallPct * 10) / 10,
    slackSent,
  });
}
