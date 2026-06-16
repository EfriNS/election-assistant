import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  const { messages, isFinalTurn, sessionId } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ errorCode: "AUTH_ERROR" }, { status: 500 });
  }

  const heliconeKey = process.env.HELICONE_API_KEY;
  const turnNumber = messages.filter((m: { role: string }) => m.role === "user").length;

  const ai = new GoogleGenAI({
    apiKey,
    ...(heliconeKey && {
      httpOptions: {
        baseUrl: "https://gateway.helicone.ai",
        headers: {
          "Helicone-Auth": `Bearer ${heliconeKey}`,
          "Helicone-Target-URL": "https://generativelanguage.googleapis.com",
          ...(sessionId && { "Helicone-Session-Id": sessionId }),
          "Helicone-Session-Path": `/turn-${turnNumber}`,
          "Helicone-Property-Prototype": "d",
          "Helicone-Property-Final-Turn": isFinalTurn ? "true" : "false",
        },
      },
    }),
  });

  const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  const systemInstruction = SYSTEM_PROMPT + (isFinalTurn ? SYNTHESIS_INSTRUCTION : "");

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      history,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    });

    const response = await chat.sendMessage({ message: lastMessage.content });
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
    return NextResponse.json({ errorCode }, { status: isQuota ? 429 : 500 });
  }
}
