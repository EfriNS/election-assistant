import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { Langfuse } from "langfuse";
import { PARTIES } from "@/lib/parties";
import { GROUNDINGS, getTopicGroundings } from "@/lib/groundings";
import { sanitizeUserInput } from "@/lib/sanitize";

function makeLangfuse() {
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) return null;
  return new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  });
}

type FollowUpQA = { question: string; answer: string };

type TopicQAForScoring = {
  topicId: string;
  topicLabel: string;
  openerQuestion: string;
  openerAnswer: string;
  followUpQA: FollowUpQA[];
};

// scores[topicId][partyId] = number (-2..+2) | null (no platform data)
export type ScoreTopicsResult = Record<string, Record<string, number | null>>;

export function buildScoringPrompt(topics: TopicQAForScoring[]): string {
  const userBlock = topics
    .map((t) => {
      let block = `[${t.topicLabel}] ${t.openerQuestion}\nתשובה: ${t.openerAnswer}`;
      t.followUpQA.forEach((fq) => {
        block += `\n  שאלת המשך: ${fq.question}\n  תשובה: ${fq.answer}`;
      });
      return block;
    })
    .join("\n\n");

  const groundingBlock = topics
    .map((t) => {
      const partyLines = PARTIES.map((party) => {
        const entries = getTopicGroundings(party.id, t.topicId).filter(
          (e) => !e.absent && e.text.length > 0
        );
        if (entries.length === 0) return null;
        return entries
          .map((e) => `  ${party.name} (היבט: ${e.aspect}): "${e.text}"`)
          .join("\n");
      }).filter(Boolean);

      if (partyLines.length === 0) return null;
      return `[${t.topicLabel}]\n${partyLines.join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");

  // Determine which parties have no platform data at all, for the null instruction
  const partiesWithoutPlatform = PARTIES.filter(
    (p) => !GROUNDINGS[p.id]?.platformAvailable
  ).map((p) => p.name);

  return `אתה מדרג את ההתאמה בין עמדות פוליטיות של משתמש לבין טקסטים מפורסמים של מפלגות ישראליות.

**כללים:**
- דרג אך ורק על סמך הטקסטים המסופקים להלן. אל תשתמש בידע כלשהו על המפלגות מעבר למה שמופיע כאן.
- אם לא סופק טקסט עבור מפלגה מסוימת בנושא מסוים — הוצא null עבורה בנושא זה.
- מפלגות ללא מצע: ${partiesWithoutPlatform.join(", ")} — null בכל הנושאים.

**סולם הדירוג:**
+2 = התאמה חזקה   +1 = התאמה מסוימת   0 = ניטרלי / לא ברור
-1 = סתירה מסוימת  -2 = סתירה חזקה

---

**עמדות המשתמש:**
${userBlock}

---

**טקסטים מפלגתיים:**
${groundingBlock || "(אין טקסטים זמינים — החזר null לכל המפלגות בכל הנושאים)"}

---

**פורמט תוצאה — JSON בלבד, ללא markdown:**
{
${topics.map((t) => PARTIES.map((p) => `  "${t.topicId}.${p.id}": <מספר_או_null>`).join(",\n")).join(",\n")}
}`;
}

function parseScores(
  raw: string,
  topics: TopicQAForScoring[]
): ScoreTopicsResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};

  const flat: Record<string, number | null> = JSON.parse(jsonMatch[0]);
  const result: ScoreTopicsResult = {};

  for (const t of topics) {
    result[t.topicId] = {};
    for (const party of PARTIES) {
      const key = `${t.topicId}.${party.id}`;
      const val = flat[key];
      result[t.topicId][party.id] = typeof val === "number" ? val : null;
    }
  }

  return result;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { topics: TopicQAForScoring[]; sessionId?: string };
  const rawTopics = body.topics;
  const sessionId = body.sessionId;

  // Input validation
  if (!Array.isArray(rawTopics) || rawTopics.length === 0 || rawTopics.length > 9) {
    return NextResponse.json({ errorCode: "INVALID_INPUT" }, { status: 400 });
  }
  for (const t of rawTopics) {
    if (!t.topicId || !t.openerAnswer) {
      return NextResponse.json({ errorCode: "INVALID_INPUT" }, { status: 400 });
    }
  }

  // Sanitize all user text before building the AI prompt
  const topics: TopicQAForScoring[] = rawTopics.map((t) => ({
    ...t,
    openerAnswer: sanitizeUserInput(t.openerAnswer, 500),
    followUpQA: t.followUpQA.map((fq) => ({
      ...fq,
      answer: sanitizeUserInput(fq.answer, 200),
    })),
  }));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ errorCode: "AUTH_ERROR" }, { status: 500 });

  const model = "gemini-3.1-flash-lite";
  const prompt = buildScoringPrompt(topics);

  const topicsWithGroundings = topics.filter((t) =>
    PARTIES.some((p) => getTopicGroundings(p.id, t.topicId).some((e) => !e.absent && e.text))
  );
  const partiesWithData = PARTIES
    .filter((p) => GROUNDINGS[p.id]?.platformAvailable)
    .map((p) => p.id);

  const langfuse = makeLangfuse();
  const trace = langfuse?.trace({
    name: "score-topics",
    sessionId,
    metadata: {
      topicsRequested: topics.map((t) => t.topicId),
      topicsWithGroundings: topicsWithGroundings.map((t) => t.topicId),
      partiesWithData,
    },
  });
  // Do not pass prompt as input — it contains user answers (PII).
  const generation = trace?.generation({ name: "gemini-score-topics", model });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0.2, maxOutputTokens: 1500 },
    });

    const text = response.text ?? "";
    const scores = parseScores(text, topics);

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

    return NextResponse.json({ scores });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isQuota = msg.includes("429") || msg.toLowerCase().includes("quota");
    generation?.update({ output: msg, level: "ERROR" });
    generation?.end();
    await langfuse?.flushAsync();
    return NextResponse.json(
      { errorCode: isQuota ? "QUOTA_EXCEEDED" : "SERVER_ERROR" },
      { status: isQuota ? 429 : 500 }
    );
  }
}
