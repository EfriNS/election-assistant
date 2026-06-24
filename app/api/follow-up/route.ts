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

type TopicRef = { label: string; question: string };

type PartyGroundingEntry = {
  text: string;
  aspect: string;
  contrary?: string;
};

type PartyGroundingRef = {
  partyId: string;
  partyName: string;
  entries: PartyGroundingEntry[];
};

function buildPrompt(
  conversationSoFar: ConversationEntry[],
  currentTopic: {
    label: string;
    openerQuestion: string;
    openerAnswer: string;
    followUpQA: FollowUpQA[];
  },
  nextTopic: TopicRef | null,
  tone: string,
  depth: string,
  followUpsAskedThisTopic: number,
  partyGroundings: PartyGroundingRef[],
  currentScores: Record<string, number>,
  coveredAspects: string[],
  keyDimensions: string[],
  forceFollowUp: boolean
): string {
  const register =
    tone === "personal"
      ? "Everyday language, warm and informal, use first person"
      : "Analytical and policy-focused, formal register";

  // "Other" opener answers must always get at least one follow-up to produce a scorable signal.
  // At depth=short the model would otherwise often skip follow-ups entirely.
  const depthGuide = forceFollowUp
    ? "The user gave a free-text answer (not a preset option). Ask EXACTLY ONE clarifying follow-up question to understand their position more precisely, then transition."
    : depth === "deep"
      ? "aim for 1–3 follow-ups per topic"
      : "aim for 0–1 follow-ups per topic";

  const historyBlock =
    conversationSoFar.length === 0
      ? "This is the first topic in the conversation."
      : conversationSoFar
          .map((e) => {
            let line = `${e.topicLabel}: "${e.openerAnswer}"`;
            e.followUpQA.forEach((fq) => { line += ` → ${fq.answer}`; });
            return line;
          })
          .join("\n");

  const followUpQABlock =
    currentTopic.followUpQA.length === 0
      ? ""
      : "\nFollow-up Q&A on this topic so far:\n" +
        currentTopic.followUpQA.map((fq) => `  Q: ${fq.question}\n  A: ${fq.answer}`).join("\n");

  const nextTopicBlock = nextTopic
    ? `Next topic: ${nextTopic.label}\nNext question: ${nextTopic.question}`
    : "This is the last topic in the conversation.";

  // Build party-differentiating grounding block when platform data is available
  const topCloseParties = Object.entries(currentScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, score]) => `${id}: ${score}%`)
    .join(", ");

  const uncoveredKeyDimensions = keyDimensions.filter((d) => !coveredAspects.includes(d));
  const groundingBlock = partyGroundings.length > 0
    ? `\n**Party platform positions on this topic (verbatim — use ONLY these texts, no other knowledge):**\n` +
      partyGroundings.map((pg) =>
        pg.entries.map((e) =>
          `${pg.partyName} [היבט: ${e.aspect}]: "${e.text}"${e.contrary ? ` (מתנגד ל: ${e.contrary})` : ""}`
        ).join("\n")
      ).join("\n") +
      `\n\n**Current close parties (top scores):** ${topCloseParties}` +
      (coveredAspects.length > 0
        ? `\n**Aspects already covered in this topic:** ${coveredAspects.join(", ")} — do NOT ask about these again.`
        : "") +
      (uncoveredKeyDimensions.length > 0
        ? `\n**Priority dimensions to probe (in order):** ${uncoveredKeyDimensions.join(", ")} — prefer these over other aspects when choosing a follow-up sub-dimension.`
        : "") +
      `\n\n**Follow-up task:** Ask about the highest-priority uncovered dimension from the list above where the close parties clearly differ. If no such discriminating dimension remains uncovered, transition to the next topic.`
    : "";

  return `You are a neutral political advisor conducting a structured survey to help users identify which Israeli party best matches their views. Respond ONLY in Hebrew.
Style: ${register}
Always use masculine Hebrew form (מבין, מסכים, שואל וכו׳).

**Conversation so far:**
${historyBlock}

**Current topic:** ${currentTopic.label}
Opener: ${currentTopic.openerQuestion}
User's answer: ${currentTopic.openerAnswer}${followUpQABlock}
${groundingBlock}
${nextTopicBlock}

**Depth guidance:** ${depthGuide}
You have asked ${followUpsAskedThisTopic} follow-up(s) on this topic so far.

**Your task — return JSON only, no markdown:**

Decide whether to ask a follow-up question or transition to the next topic.

- If following up:
  - prologue (REQUIRED, non-null): 1–2 sentences that acknowledge the user's specific answer and naturally lead into the follow-up question. This is the ONLY place for bridging/contextualizing language. If the user's answer starts with a number (e.g. "2. ..."), you may naturally reference it as "בחרת באפשרות 2" or "ציינת בחירה 2". If the user wrote a combination (e.g. "1+3, אבל לא..."), acknowledge the combination directly.
  - question: a direct, neutral question in interrogative form (e.g. "כיצד...?", "מה לדעתך...?"). Do NOT start the question with phrases like "כדי להעמיק..." or "בהמשך ל..." — those belong in the prologue.
  - options: 3–4 concise answer options + "אחר — פרט" last.
  - hint (optional): 1–2 sentence Hebrew definition if the question uses unfamiliar jargon.
  - targetedAspect (optional): the aspect label this question probes (from the party platform data above). Omit if no grounding data was used.

- If transitioning (or this is the last topic):
  - prologue (REQUIRED, non-null): 1–3 sentences that briefly wrap up the current topic and naturally introduce the next one. Reference the next topic's question if it helps the transition feel natural.
  - followUp: null.

prologue is ALWAYS non-null — never omit it or return null for it.

Format:
{"prologue":"...","followUp":{"question":"...","options":["...","...","...","אחר — פרט"],"hint":"...","targetedAspect":"..."},"targetedAspect":"..."}

(followUp is null when transitioning. Omit hint and targetedAspect fields when not needed.)`;
}

export async function POST(req: NextRequest) {
  const {
    conversationSoFar,
    currentTopic,
    nextTopic,
    tone,
    depth,
    followUpsAskedThisTopic,
    partyGroundings = [],
    currentScores = {},
    coveredAspects = [],
    keyDimensions = [],
    forceFollowUp = false,
  }: {
    conversationSoFar: ConversationEntry[];
    currentTopic: { label: string; openerQuestion: string; openerAnswer: string; followUpQA: FollowUpQA[] };
    nextTopic: TopicRef | null;
    tone: string;
    depth: string;
    followUpsAskedThisTopic: number;
    partyGroundings?: PartyGroundingRef[];
    currentScores?: Record<string, number>;
    coveredAspects?: string[];
    keyDimensions?: string[];
    forceFollowUp?: boolean;
  } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ prologue: null, followUp: null });

  const model = "gemini-3.1-flash-lite";
  const prompt = buildPrompt(
    conversationSoFar, currentTopic, nextTopic, tone, depth, followUpsAskedThisTopic,
    partyGroundings, currentScores, coveredAspects, keyDimensions, forceFollowUp
  );

  const langfuse = makeLangfuse();
  const trace = langfuse?.trace({
    name: "follow-up-generation",
    metadata: {
      prototype: "e",
      topic: currentTopic.label,
      tone,
      depth,
      followUpsAskedThisTopic,
      forceFollowUp,
      hasGroundingData: partyGroundings.length > 0,
    },
  });
  const generation = trace?.generation({ name: "gemini-follow-up", model, input: prompt });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0.7, maxOutputTokens: 500 },
    });

    const text = response.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      generation?.update({ output: "", level: "WARNING" });
      generation?.end();
      await langfuse?.flushAsync();
      return NextResponse.json({ prologue: null, followUp: null });
    }

    const parsed = JSON.parse(jsonMatch[0]);
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

    const followUp = parsed.followUp
      ? {
          question: parsed.followUp.question,
          options: parsed.followUp.options,
          hint: parsed.followUp.hint ?? undefined,
          targetedAspect: parsed.followUp.targetedAspect ?? parsed.targetedAspect ?? undefined,
        }
      : null;

    return NextResponse.json({ prologue: parsed.prologue || null, followUp });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isQuota = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.toLowerCase().includes("quota");
    generation?.update({ output: msg, level: "ERROR" });
    generation?.end();
    await langfuse?.flushAsync();
    if (isQuota) return NextResponse.json({ errorCode: "QUOTA_EXCEEDED" }, { status: 429 });
    return NextResponse.json({ prologue: null, followUp: null });
  }
}
