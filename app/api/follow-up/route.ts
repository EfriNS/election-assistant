import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

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

  return `אתה יועץ ניטרלי שמנהל סקר עמדות פוליטי בעברית.
סגנון: ${register}

**מה שנדון עד כה:**
${historyBlock}

**הנושא הנוכחי:** ${currentTopic.label}
שאלה: ${currentTopic.openerQuestion}
תשובת המשתמש: ${currentTopic.openerAnswer}

${nextTopicLine}

**המשימה שלך — החזר JSON בלבד:**

1. שאלת המשך (אופציונלי, מקסימום ${maxFollowUps}):
   - אם התשובה ברורה ומספיקה → החזר null
   - אם יש ניואנס שכדאי לחדד → צור שאלה אחת עם 3-4 אפשרויות תמציתיות + "אחר — פרט" בסוף

2. מעבר לנושא הבא (אם קיים):
   - משפט קצר (עד 2 משפטים) שמאשר את תשובת המשתמש ומחבר לנושא הבא
   - אם זה הנושא האחרון → החזר null

פורמט:
{"followUp":{"question":"...","options":["...","...","...","אחר — פרט"]},"nextPrologue":"..."}

(החזר null עבור כל שדה שאין בו תוכן)`;
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

  const prompt = buildPrompt(conversationSoFar, currentTopic, nextTopic, tone, maxFollowUps);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { temperature: 0.7, maxOutputTokens: 400 },
    });

    const text = response.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ followUp: null, nextPrologue: null });

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      followUp: parsed.followUp ?? null,
      nextPrologue: parsed.nextPrologue ?? null,
    });
  } catch {
    return NextResponse.json({ followUp: null, nextPrologue: null });
  }
}
