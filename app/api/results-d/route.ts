import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { notifySlack } from "@/lib/slack";

type Message = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You analyze a political conversation and extract a structured values profile. All output must be in Hebrew.

You receive a transcript of a conversation where an AI advisor asked a user about their political positions.

Your task:
1. profile — 2–3 sentences summarizing the user's political profile. Address the user in second person (Hebrew: אתה/את).
2. scores — match score 0–100 for each party, based solely on what the user said in the conversation. 100 = perfect match, 0 = complete opposition.
3. partyBlurbs — for the 3 highest-scoring parties: 1–2 sentences explaining the match, citing specific things the user said.
4. groundings — return an empty list (will be added in a future version).

Parties (id → name and general position):
hadash    → חד"ש-תע"ל (Jewish-Arab left — peace, equality, workers' rights)
democrats → הדמוקרטים (center-left — welfare, social equality, political settlement)
beyahad   → ביחד בנט/לפיד (center — clean governance, education, separation of religion and state)
yashar    → ישר! איזנקוט (center-right — national security, transparency, responsible governance)
beitenu   → ישראל ביתנו (secular right — separation of religion and state, tough security positions)
likud     → ליכוד (national right — strong security, market economy, social conservatism)
shas      → ש"ס (religious-Sephardic right — traditional values, care for weaker classes)

Rules:
- Hebrew output only
- Second person in all texts
- Blurbs must reference specific things the user said — not general party descriptions
- Return JSON only, no markdown fences:
{"profile":"...","scores":{"hadash":0,"democrats":0,"beyahad":0,"yashar":0,"beitenu":0,"likud":0,"shas":0},"partyBlurbs":{"<id>":"<blurb>"},"groundings":[]}`;

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ errorCode: "AUTH_ERROR" }, { status: 500 });

  const transcript = messages
    .map((m) => `[${m.role === "user" ? "User" : "Advisor"}]: ${m.content}`)
    .join("\n\n");

  const userMessage = `Here is the conversation transcript:\n\n${transcript}\n\nPlease analyze this specific conversation.`;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const chat = ai.chats.create({
      model: "gemini-3.1-flash-lite",
      history: [],
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.4, maxOutputTokens: 900 },
    });

    const response = await chat.sendMessage({ message: userMessage });
    let text = (response.text ?? "").trim();

    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    const parsed = JSON.parse(text);
    if (!parsed.profile || !parsed.scores || !parsed.partyBlurbs) throw new Error("unexpected shape");

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Results-D AI error:", msg);
    const isQuota = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.toLowerCase().includes("quota");
    const errorCode = isQuota ? "QUOTA_EXCEEDED" : "SERVER_ERROR";
    await notifySlack(`🚨 /api/results-d — ${errorCode}\n${msg.slice(0, 300)}`);
    return NextResponse.json({ errorCode }, { status: isQuota ? 429 : 500 });
  }
}
