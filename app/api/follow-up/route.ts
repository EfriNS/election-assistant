import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const TOPIC_LABELS: Record<string, string> = {
  security: "ביטחון",
  economy: "כלכלה",
  housing: "דיור",
  education: "חינוך",
  health: "בריאות",
  religion: "דת ומדינה",
  justice: "שלטון החוק",
  equality: "זכויות ושוויון",
};

export async function POST(req: NextRequest) {
  const { topic, openerQuestion, openerAnswer, tone, count } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ followUps: [] }, { status: 200 });
  }

  const topicLabel = TOPIC_LABELS[topic] ?? topic;
  const register =
    tone === "personal"
      ? "חמה ומשוחחת — שפת חיים יומיומיים, גוף ראשון"
      : "עניינית ומנתחת — שפת מדיניות ציבורית";

  const prompt = `אתה עוזר ניטרלי שיוצר שאלות המשך לסקר פוליטי בעברית.

נושא: ${topicLabel}
שאלת הפתיחה: ${openerQuestion}
תשובת המשתמש: ${openerAnswer}
סגנון: ${register}
מספר שאלות המשך לייצר: ${count}

צור ${count} שאלות המשך שמעמיקות בעמדת המשתמש בנושא ${topicLabel}.
כל שאלה צריכה להיות עם 3-4 אפשרויות תשובה קצרות (עד 10 מילים כל אחת).

החזר JSON בלבד בפורמט הבא (ללא טקסט נוסף):
{"followUps":[{"question":"...","options":["...","...","..."]}]}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { temperature: 0.7, maxOutputTokens: 600 },
    });

    const text = response.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ followUps: [] });

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.followUps)) return NextResponse.json({ followUps: [] });

    return NextResponse.json({ followUps: parsed.followUps.slice(0, count) });
  } catch {
    return NextResponse.json({ followUps: [] });
  }
}
