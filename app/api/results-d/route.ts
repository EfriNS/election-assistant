import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

type Message = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `אתה מנתח שיחה פוליטית ומחלץ ממנה פרופיל ערכי מובנה.

קיבלת תמלול של שיחה שבה עוזר AI שאל משתמש על עמדותיו הפוליטיות.

תפקידך:
1. profile — 2–3 משפטים המסכמים את הפרופיל הפוליטי של המשתמש. פנה אליו בגוף שני.
2. scores — ציון התאמה 0–100 לכל מפלגה, על סמך מה שהמשתמש אמר בשיחה בלבד. 100 = התאמה מלאה, 0 = ניגוד מוחלט.
3. partyBlurbs — לשלוש המפלגות שקיבלו ציון גבוה ביותר: 1–2 משפטים המסבירים את ההתאמה תוך הזכרת דברים ספציפיים שהמשתמש אמר.
4. groundings — החזר רשימה ריקה (יתווסף בגרסה עתידית).

המפלגות (id → שם ועמדה כללית):
hadash   → חד"ש-תע"ל (שמאל יהודי-ערבי — שלום, שוויון, זכויות עובדים)
democrats → הדמוקרטים (מרכז-שמאל — רווחה, שוויון חברתי, הסדר מדיני)
beyahad  → ביחד בנט/לפיד (מרכז — ממשל נקי, חינוך, הפרדת דת ומדינה)
yashar   → ישר! איזנקוט (מרכז-ימין — ביטחון לאומי, שקיפות, ממשל אחראי)
beitenu  → ישראל ביתנו (ימין חילוני — הפרדת דת ומדינה, עמדות ביטחוניות נוקשות)
likud    → ליכוד (ימין לאומי — ביטחון חזק, כלכלת שוק, שמרנות חברתית)
shas     → ש"ס (ימין דתי-ספרדי — ערכים מסורתיים, דאגה לשכבות חלשות)

כללים:
- עברית בלבד
- גוף שני בכל הטקסטים
- הblurbs חייבים להתייחס לדברים ספציפיים שהמשתמש אמר — לא לתיאורים כלליים של המפלגה
- החזר JSON בלבד, ללא markdown fences:
{"profile":"...","scores":{"hadash":0,"democrats":0,"beyahad":0,"yashar":0,"beitenu":0,"likud":0,"shas":0},"partyBlurbs":{"<id>":"<blurb>"},"groundings":[]}`;

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ errorCode: "AUTH_ERROR" }, { status: 500 });

  const transcript = messages
    .map((m) => `[${m.role === "user" ? "משתמש" : "עוזר"}]: ${m.content}`)
    .join("\n\n");

  const userMessage = `להלן תמלול השיחה:\n\n${transcript}\n\nאנא נתח ספציפי לשיחה זו.`;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const chat = ai.chats.create({
      model: "gemini-3.1-flash-lite",
      history: [],
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.4, maxOutputTokens: 900 },
    });

    const response = await chat.sendMessage({ message: userMessage });
    let text = (response.text ?? "").trim();

    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    const parsed = JSON.parse(text);
    if (!parsed.profile || !parsed.scores || !parsed.partyBlurbs) throw new Error("unexpected shape");

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Results-D AI error:", msg);
    return NextResponse.json({ errorCode: "SERVER_ERROR" }, { status: 500 });
  }
}
