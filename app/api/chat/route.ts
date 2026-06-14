import { GoogleGenerativeAI } from "@google/generative-ai";
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

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
    systemInstruction: SYSTEM_PROMPT,
  });

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();
    return NextResponse.json({ content: text });
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json({ error: "שגיאה בתקשורת עם ה-AI" }, { status: 500 });
  }
}
