import { NextRequest, NextResponse } from "next/server";

const MAX_TEXT_LENGTH = 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.text !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const text = body.text.trim().slice(0, MAX_TEXT_LENGTH);
  if (!text) {
    return NextResponse.json({ error: "Empty feedback" }, { status: 400 });
  }

  const context: string = typeof body.context === "string" ? body.context : "—";

  const webhookUrl = process.env.FEEDBACK_SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    // Configured but not sending — still acknowledge to the user
    console.warn("[feedback] FEEDBACK_SLACK_WEBHOOK_URL not set; feedback dropped:", text);
    return NextResponse.json({ ok: true });
  }

  const slackBody = {
    text: `💬 משוב מהאפליקציה`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `💬 *משוב מהאפליקציה*\n>${text.replace(/\n/g, "\n>")}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*עמוד:* ${context}`,
          },
        ],
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slackBody),
  });

  if (!res.ok) {
    console.error("[feedback] Slack webhook failed:", res.status);
    return NextResponse.json({ error: "Failed to send" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
