import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { Langfuse } from "langfuse";

const SYSTEM_PROMPT = `אתה עוזר ניטרלי שעוזר לאנשים לגלות לאיזו מפלגה פוליטית הם הכי קרובים.

**חשוב מאוד:**
- אתה עובד לפי רשימת נושאים מובנית: ביטחון, כלכלה, דיור, חינוך, בריאות, דת ומדינה, שלטון החוק, זכויות אדם.
- שאל שאלה אחת בכל פעם. הקשב לתשובה ועמיק בה לפני שתעבור לנושא הבא.
- אל תציג עמדות פוליטיות משלך ואל תשפוט את המשתמש.
- אחרי כ-8-10 נושאים, סכם את עמדות המשתמש ותן תוצאה: דרג את המפלגות הבאות לפי קרבה לעמדות המשתמש: חד"ש-תע"ל, הדמוקרטים, ביחד (בנט/לפיד), ישר! (איזנקוט), ישראל ביתנו, ליכוד, ש"ס.
- לכל מפלגה שציינת — הוסף משפט קצר המסביר מדוע היא קרובה (או רחוקה) לעמדות המשתמש על סמך מה שאמר בשיחה.
- דבר בעברית בלבד. היה ידידותי, סקרן, לא שיפוטי.
- כשאתה נותן תוצאות, השתמש בפורמט: "**[מספר]. [שם מפלגה]** — [הסבר קצר מדוע]"

התחל את השיחה בברכה קצרה ובשאלה הראשונה על נושא הביטחון.`;

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
  const { messages, isFinalTurn, sessionId } = await req.json();

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
    metadata: { turnNumber, isFinalTurn, prototype: "d" },
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
  const systemInstruction = SYSTEM_PROMPT + (isFinalTurn ? SYNTHESIS_INSTRUCTION : "");

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
