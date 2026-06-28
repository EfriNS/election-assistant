import { NextRequest, NextResponse } from "next/server";
import { Langfuse } from "langfuse";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

function getEnvInt(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v ? parseInt(v, 10) : NaN;
  return isNaN(n) ? fallback : n;
}

type RouteStats = { count: number; tokens: number };
export type UsageTotals = { tokens: number; requests: number; byRoute: Record<string, RouteStats> };

export async function fetchWindowUsage(
  client: Langfuse,
  fromTime: Date,
  toTime: Date
): Promise<UsageTotals> {
  let tokens = 0;
  let requests = 0;
  const byRoute: Record<string, RouteStats> = {};
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
      const t = (obs.usage?.input ?? 0) + (obs.usage?.output ?? 0);
      tokens += t;
      requests++;
      const name = (obs.name as string) ?? "unknown";
      if (!byRoute[name]) byRoute[name] = { count: 0, tokens: 0 };
      byRoute[name].count++;
      byRoute[name].tokens += t;
    }

    if (result.data.length < limit) break;
    page++;
  }

  return { tokens, requests, byRoute };
}

export function computeRequestPct(requests: number, requestLimit: number): number {
  return requestLimit > 0 ? (requests / requestLimit) * 100 : 0;
}

export function buildSlackBody(
  requestPct: number,
  requestLimit: number,
  totals: UsageTotals
): object {
  const emoji = requestPct >= 90 ? "🚨" : requestPct >= 80 ? "⚠️" : requestPct >= 50 ? "📊" : "✅";
  const pct   = requestPct.toFixed(0);

  const routeLines = Object.entries(totals.byRoute)
    .sort((a, b) => b[1].tokens - a[1].tokens)
    .map(([name, s]) => `  ${name}: ${s.count} call${s.count !== 1 ? "s" : ""}, ${s.tokens.toLocaleString()} tokens`)
    .join("\n");

  return {
    text: `${emoji} Gemini daily usage — ${pct}% of request limit`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*${emoji} Gemini daily usage summary*\n` +
            `Requests: ${totals.requests.toLocaleString()} / ${requestLimit.toLocaleString()} (${requestPct.toFixed(1)}%)\n` +
            `Tokens today: ${totals.tokens.toLocaleString()}\n` +
            `Model: ${GEMINI_MODEL}`,
        },
      },
      ...(routeLines ? [{
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*By route:*\n\`\`\`${routeLines}\`\`\``,
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
  }

  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    return NextResponse.json({ error: "Langfuse not configured" }, { status: 503 });
  }

  const requestLimit = getEnvInt("QUOTA_DAILY_REQUEST_LIMIT", 500);
  const webhookUrl   = process.env.QUOTA_SLACK_WEBHOOK_URL;

  const client = new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey:  process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl:   process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  });

  const now        = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const totals     = await fetchWindowUsage(client, todayStart, now);
  const requestPct = computeRequestPct(totals.requests, requestLimit);

  let slackSent = false;
  if (webhookUrl) {
    const body = buildSlackBody(requestPct, requestLimit, totals);
    await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    slackSent = true;
  }

  return NextResponse.json({
    requestsToday: totals.requests,
    tokensToday:   totals.tokens,
    requestPct:    Math.round(requestPct * 10) / 10,
    byRoute:       totals.byRoute,
    slackSent,
  });
}
