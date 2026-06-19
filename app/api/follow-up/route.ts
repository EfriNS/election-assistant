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

type FollowUpQA = { question: string; answer: string };

type ConversationEntry = {
  topicLabel: string;
  openerQuestion: string;
  openerAnswer: string;
  followUpQA: FollowUpQA[];
};

type TopicRef = { id: string; label: string };

function buildPrompt(
  conversationSoFar: ConversationEntry[],
  currentTopic: { label: string; openerQuestion: string; openerAnswer: string },
  nextTopic: TopicRef | null,
  tone: string,
  maxFollowUps: number
): string {
  const register =
    tone === "personal"
      ? "חמה ומשוחחת — שפת יומיום, גוף ראשון"
      : "עניינית ומנתחת — שפת מדיניות ציבורית";

  const historyBlock =
    conversationSoFar.length === 0
      ? "זהו הנושא הראשון בשיחה."
      : conversationSoFar
          .map((e) => {
            let line = `${e.topicLabel}: "${e.openerAnswer}"`;
            e.followUpQA.forEach((fq) => { line += ` → ${fq.answer}`; });
            return line;
          })
          .join("\n");

  const nextTopicLine = nextTopic
    ? `הנושא הבא: ${nextTopic.label}`
    : "זהו הנושא האחרון בשיחה.";

  return `You are a neutral political survey advisor. Respond ONLY in Hebrew.
Style: ${register}
Always use masculine form (מבין, מסכים, שואל וכו׳).

**Conversation so far:**
${historyBlock}

**Current topic:** ${currentTopic.label}
Question: ${currentTopic.openerQuestion}
User's answer: ${currentTopic.openerAnswer}

${nextTopicLine}

**Your task — return JSON only, no markdown:**

1. Follow-up question (optional, max ${maxFollowUps}):
   - If the answer is clear enough → return null for followUp
   - If there's a nuance worth clarifying → create one follow-up with 3-4 concise options + "אחר — פרט" last
   - Optionally add a "hint" field: a short Hebrew definition (1-2 sentences) if the follow-up question contains jargon or a term that may be unfamiliar. Omit if the question is already plain.

2. Transition to next topic (if exists):
   - A short sentence (up to 2) acknowledging the user's answer and bridging to the next topic
   - If this is the last topic → return null for nextPrologue

Format:
{"followUp":{"question":"...","options":["...","...","...","אחר — פרט"],"hint":"..."},"nextPrologue":"..."}

(Return null for any field with no content)`;
}

export async function POST(req: NextRequest) {
  const {
    conversationSoFar,
    currentTopic,
    nextTopic,
    tone,
    maxFollowUps,
  }: {
    conversationSoFar: ConversationEntry[];
    currentTopic: { label: string; openerQuestion: string; openerAnswer: string };
    nextTopic: TopicRef | null;
    tone: string;
    maxFollowUps: number;
  } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ followUp: null, nextPrologue: null });

  const model = "gemini-3.1-flash-lite";
  const prompt = buildPrompt(conversationSoFar, currentTopic, nextTopic, tone, maxFollowUps);

  const langfuse = makeLangfuse();
  const trace = langfuse?.trace({
    name: "follow-up-generation",
    metadata: { prototype: "e", topic: currentTopic.label, tone, maxFollowUps },
  });
  const generation = trace?.generation({
    name: "gemini-follow-up",
    model,
    input: prompt,
  });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0.7, maxOutputTokens: 400 },
    });

    const text = response.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      generation?.update({ output: "", level: "WARNING" });
      generation?.end();
      await langfuse?.flushAsync();
      return NextResponse.json({ followUp: null, nextPrologue: null });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    generation?.update({ output: text });
    generation?.end();
    await langfuse?.flushAsync();

    const followUp = parsed.followUp
      ? { question: parsed.followUp.question, options: parsed.followUp.options, hint: parsed.followUp.hint ?? undefined }
      : null;
    return NextResponse.json({ followUp, nextPrologue: parsed.nextPrologue ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    generation?.update({ output: msg, level: "ERROR" });
    generation?.end();
    await langfuse?.flushAsync();
    return NextResponse.json({ followUp: null, nextPrologue: null });
  }
}
