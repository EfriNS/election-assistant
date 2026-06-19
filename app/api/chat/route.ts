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

  return `**הקשר המשתמש:**
עדיפויות (מהגבוה לנמוך): ${sorted}
סגנון: ${register}
עומק: ${depthNote}

התחל מהנושאים שדורגו גבוה ביותר.

---

`;
}

const SYSTEM_PROMPT = `אתה עוזר ניטרלי שעוזר לאנשים לגלות לאיזו מפלגה פוליטית הם הכי קרובים.

**חשוב מאוד:**
- אתה עובד לפי רשימת נושאים מובנית: ביטחון, כלכלה, דיור, חינוך, בריאות, דת ומדינה, שלטון החוק, זכויות אדם.
- שאל שאלה אחת בכל פעם. הקשב לתשובה ועמיק בה לפי הצורך, אך אל תשאל יותר מ-2 שאלות על אותו נושא לפני שתמשיך הלאה.
- אל תציג עמדות פוליטיות משלך ואל תשפוט את המשתמש.
- אחרי כ-8-10 נושאים, סכם את עמדות המשתמש ותן תוצאה: דרג את המפלגות הבאות לפי קרבה לעמדות המשתמש: חד"ש-תע"ל, הדמוקרטים, ביחד (בנט/לפיד), ישר! (איזנקוט), ישראל ביתנו, ליכוד, ש"ס.
- לכל מפלגה שציינת — הוסף משפט קצר המסביר מדוע היא קרובה (או רחוקה) לעמדות המשתמש על סמך מה שאמר בשיחה.
- דבר בעברית בלבד. היה ידידותי, סקרן, לא שיפוטי.
- כשאתה נותן תוצאות, השתמש בפורמט: "**[מספר]. [שם מפלגה]** — [הסבר קצר מדוע]"
- כאשר אתה מציג אפשרויות אפשריות לתשובה, הצג כל אפשרות בשורה נפרדת עם מספר (1. ... 2. ... 3. ...), והוסף בסוף: "4. משהו אחר — במילים שלך". המשתמש יכול לבחור אפשרות או לכתוב כל תשובה חופשית.

המשתמש כבר ראה הסבר כללי על השיחה. פתח ישירות בשאלה הראשונה על נושא הביטחון, ללא ברכה נוספת.`;

const SYNTHESIS_INSTRUCTION = `

**הוראה מיוחדת — סיום שיחה:**
הגעת למגבלת השיחה. אל תשאל שאלות נוספות.
סכם כעת את עמדות המשתמש ותן את הדירוג הסופי של המפלגות לפי הקרבה אליו.
השתמש בפורמט הנדרש: "**[מספר]. [שם מפלגה]** — [הסבר]"`;

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
    generation?.update({ output: response.text ?? "" });
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
