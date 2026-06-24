import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { Langfuse } from "langfuse";

const TOPIC_LABELS: Record<string, string> = {
  security:  "ביטחון ומדיניות חוץ",
  economy:   "כלכלה ותעסוקה",
  housing:   "דיור ועלות מחיה",
  education: "חינוך",
  health:    "בריאות",
  religion:  "דת ומדינה",
  justice:   "שלטון החוק ומערכת המשפט",
  equality:  "זכויות אדם ומיעוטים",
};

const BUCKET_LABELS: Record<number, string> = {
  4: "קריטי", 3: "חשוב מאוד", 2: "חשוב", 1: "פחות חשוב",
};

function buildContextBlock(
  priorities: Record<string, number>,
  tone: string,
  depth: string
): string {
  const sorted = Object.entries(priorities)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, w]) => `${TOPIC_LABELS[id] ?? id} (${BUCKET_LABELS[w] ?? w})`)
    .join(", ");

  if (!sorted) return "";

  const register =
    tone === "personal"
      ? "חמה ומשוחחת — שפת חיים יומיומיים, גוף ראשון"
      : "עניינית ומנתחת — שפת מדיניות ציבורית";

  const depthNote =
    depth === "deep"
      ? "שיחה מעמיקה — 8–12 תורות לפני סיכום"
      : "שיחה קצרה — 4–6 תורות לפני סיכום";

  return `**User context:**
Priorities (high to low): ${sorted}
Style: ${register}
Depth: ${depthNote}

Start from the highest-ranked topics.

---

`;
}

const SYSTEM_PROMPT = `You are a neutral assistant helping people discover which Israeli political party aligns with their values. All conversation must be in Hebrew.

Important rules:
- Work through a structured topic list: security, economy, housing, education, health, religion & state, rule of law, civil rights.
- Ask one question at a time. Listen to the answer and probe if needed, but move on after at most 2 questions per topic.
- Do not express your own political opinions and do not judge the user.
- After ~8-10 topics, summarize the user's positions and rank the following parties by closeness: חד"ש-תע"ל, הדמוקרטים, ביחד (בנט/לפיד), ישר! (איזנקוט), ישראל ביתנו, ליכוד, ש"ס.
- For each party you mention — add a short sentence explaining why it is close (or distant) based on what the user said in the conversation.
- Speak Hebrew only. Be friendly, curious, non-judgmental.
- When giving results use the format: "**[number]. [party name]** — [short explanation]"
- When presenting answer options, list each on its own line with a number (1. ... 2. ... 3. ...), and add at the end: "4. משהו אחר — במילים שלך". The user may choose an option or write any free-text answer.
- Always use masculine Hebrew form (מבין, מסכים, שואל וכו׳).

The user has already seen a general explanation of the conversation. Open directly with the first question about security, without any additional greeting.`;

const SYNTHESIS_INSTRUCTION = `

**Special instruction — end of conversation:**
You have reached the conversation limit. Do not ask further questions.
Summarize the user's positions now and give the final party ranking by closeness.
Use the required format: "**[number]. [party name]** — [explanation]"`;

function makeLangfuse() {
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) return null;
  return new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  });
}

export async function POST(req: NextRequest) {
  const { messages, isFinalTurn, sessionId, priorities, tone, depth } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ errorCode: "AUTH_ERROR" }, { status: 500 });
  }

  const turnNumber = messages.filter((m: { role: string }) => m.role === "user").length;
  const model = "gemini-3.1-flash-lite";

  const langfuse = makeLangfuse();
  const trace = langfuse?.trace({
    name: "conversation-turn",
    sessionId: sessionId ?? undefined,
    metadata: { turnNumber, isFinalTurn, prototype: "d", tone: tone ?? null, depth: depth ?? null },
  });
  const generation = trace?.generation({
    name: "gemini-response",
    model,
    input: messages,
  });

  const ai = new GoogleGenAI({ apiKey });

  const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  const contextBlock = priorities ? buildContextBlock(priorities, tone ?? "formal", depth ?? "short") : "";
  const systemInstruction = contextBlock + SYSTEM_PROMPT + (isFinalTurn ? SYNTHESIS_INSTRUCTION : "");

  try {
    const chat = ai.chats.create({
      model,
      history,
      config: { systemInstruction, temperature: 0.7, maxOutputTokens: 2000 },
    });

    const response = await chat.sendMessage({ message: lastMessage.content });
    generation?.update({
      output: response.text ?? "",
      usage: {
        input:  response.usageMetadata?.promptTokenCount    ?? 0,
        output: response.usageMetadata?.candidatesTokenCount ?? 0,
        unit:   "TOKENS",
      },
    });
    generation?.end();
    await langfuse?.flushAsync();

    return NextResponse.json({ content: response.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Gemini error:", message);

    const isQuota =
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.toLowerCase().includes("quota");
    const isAuth =
      message.includes("401") ||
      message.includes("403") ||
      message.includes("API_KEY");

    const errorCode = isQuota ? "QUOTA_EXCEEDED" : isAuth ? "AUTH_ERROR" : "SERVER_ERROR";
    generation?.update({ output: errorCode, level: "ERROR" });
    generation?.end();
    await langfuse?.flushAsync();

    return NextResponse.json({ errorCode }, { status: isQuota ? 429 : 500 });
  }
}
