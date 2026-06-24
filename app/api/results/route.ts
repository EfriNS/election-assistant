import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { Langfuse } from "langfuse";

function makeLangfuse() {
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) return null;
  return new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  });
}

type PartyRef = { id: string; name: string; score: number };

const SYSTEM_PROMPT = `You write a personalized analysis for a voting-decision aid tool. All output must be in Hebrew.

You receive:
1. The user's answers from a values questionnaire
2. Match scores for each party (calculated from a manual position matrix — not verified against official platforms)

Your task:
1. Write 2–3 sentences summarizing the user's political profile — what matters to them, what stands out in their positions. Address the user directly in second person (Hebrew: אתה/את).
2. For each of the 3 top-ranked parties provided — write 1–2 sentences explaining what brings the user's positions close to that party, based on their specific answers.

Rules:
- Hebrew output only
- Second person (אתה/את)
- Be specific — mention actual answers the user gave
- Do not invent party positions not provided to you
- Return JSON only, no markdown fences:
{"profile":"...","partyBlurbs":{"<id>":"..."}}`;

export async function POST(req: NextRequest) {
  const { answersSummary, topParties } = (await req.json()) as {
    answersSummary: string;
    topParties: PartyRef[];
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ errorCode: "AUTH_ERROR" }, { status: 500 });

  const model = "gemini-3.1-flash-lite";
  const top3 = topParties.slice(0, 3);
  const scoresText = topParties
    .map((p) => `${p.name}: ${p.score}%`)
    .join("\n");
  const blurbTargets = top3.map((p) => `${p.id} (${p.name})`).join(", ");

  const userMessage =
    `User answers:\n${answersSummary}\n\n` +
    `Party scores (high to low):\n${scoresText}\n\n` +
    `Write blurbs for the top 3 parties (use id as key): ${blurbTargets}`;

  const langfuse = makeLangfuse();
  const trace = langfuse?.trace({
    name: "results-generation",
    metadata: { model, topParty: topParties[0]?.id ?? null },
  });
  const generation = trace?.generation({
    name: "gemini-results",
    model,
    input: userMessage,
  });

  const ai = new GoogleGenAI({ apiKey });

  try {
    const chat = ai.chats.create({
      model,
      history: [],
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.5, maxOutputTokens: 700 },
    });

    const response = await chat.sendMessage({ message: userMessage });
    let text = (response.text ?? "").trim();

    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    const parsed = JSON.parse(text);
    if (!parsed.profile || !parsed.partyBlurbs) throw new Error("unexpected shape");

    generation?.update({
      output: text,
      usage: {
        input:  response.usageMetadata?.promptTokenCount    ?? 0,
        output: response.usageMetadata?.candidatesTokenCount ?? 0,
        unit:   "TOKENS",
      },
    });
    generation?.end();
    await langfuse?.flushAsync();

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Results AI error:", msg);
    const isQuota = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.toLowerCase().includes("quota");
    generation?.update({ output: msg, level: "ERROR" });
    generation?.end();
    await langfuse?.flushAsync();
    return NextResponse.json(
      { errorCode: isQuota ? "QUOTA_EXCEEDED" : "SERVER_ERROR" },
      { status: isQuota ? 429 : 500 }
    );
  }
}
