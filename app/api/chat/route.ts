import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `אתה עוזר ניטרלי שעוזר לאנשים לגלות לאיזו מפלגה פוליטית הם הכי קרובים.

**חשוב מאוד:**
- אתה עובד לפי רשימת נושאים מובנית: ביטחון, כלכלה, דיור, חינוך, בריאות, דת ומדינה, שלטון החוק, זכויות אדם.
- שאל שאלה אחת בכל פעם. הקשב לתשובה ועמיק בה לפני שתעבור לנושא הבא.
- אל תציג עמדות פוליטיות משלך ואל תשפוט את המשתמש.
- אחרי כ-8-10 נושאים, סכם את עמדות המשתמש ותן תוצאה: דרג 5 מפלגות פיקטיביות (מפלגת השלום, הבית שלנו, המרכז, ימין חזק, מפלגת הרווחה) לפי קרבה לעמדות המשתמש.
- דבר בעברית בלבד. היה ידידותי, סקרן, לא שיפוטי.
- כשאתה נותן תוצאות, השתמש בפורמט: "**[מספר]. [שם מפלגה]** — [הסבר קצר מדוע]"

התחל את השיחה בברכה קצרה ובשאלה הראשונה על נושא הביטחון.`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });

  // Convert prior turns to Gemini history format (exclude the last user message)
  const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      history,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    });

    const response = await chat.sendMessage({ message: lastMessage.content });
    return NextResponse.json({ content: response.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Gemini error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
