import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

type PartyRef = { id: string; name: string; score: number };

const SYSTEM_PROMPT = `אתה כותב ניתוח מותאם אישית לכלי סיוע בהחלטת הצבעה.

קיבלת:
1. תשובות המשתמש בשאלון ערכים
2. ניקוד ההתאמה לכל מפלגה (חושב על בסיס מטריצת עמדות ידנית — לא מאומת מול מצעים רשמיים)

תפקידך:
1. כתוב 2–3 משפטים שמסכמים את הפרופיל הפוליטי של המשתמש — מה חשוב לו, מה בולט בעמדותיו. פנה למשתמש ישירות בגוף שני.
2. לכל אחת מ-3 המפלגות המובילות שצוינו — כתוב 1–2 משפטים המסבירים מה מקרב בין עמדות המשתמש לבין המפלגה, בהתבסס על תשובותיו הספציפיות.

כללים:
- עברית בלבד
- גוף שני (אתה/את)
- היה ספציפי — הזכר תשובות ממשיות שהמשתמש נתן
- אל תמציא עמדות מפלגות שלא קיבלת
- החזר JSON בלבד, ללא markdown fences:
{"profile":"...","partyBlurbs":{"<id>":"..."}}`;

export async function POST(req: NextRequest) {
  const { answersSummary, topParties } = (await req.json()) as {
    answersSummary: string;
    topParties: PartyRef[];
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ errorCode: "AUTH_ERROR" }, { status: 500 });

  const top3 = topParties.slice(0, 3);
  const scoresText = topParties
    .map((p) => `${p.name}: ${p.score}%`)
    .join("\n");
  const blurbTargets = top3.map((p) => `${p.id} (${p.name})`).join(", ");

  const userMessage =
    `תשובות המשתמש:\n${answersSummary}\n\n` +
    `ניקוד המפלגות (מהגבוה לנמוך):\n${scoresText}\n\n` +
    `כתוב blurb עבור 3 המפלגות הראשונות (השתמש ב-id כמפתח): ${blurbTargets}`;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const chat = ai.chats.create({
      model: "gemini-3.1-flash-lite",
      history: [],
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.5, maxOutputTokens: 700 },
    });

    const response = await chat.sendMessage({ message: userMessage });
    let text = (response.text ?? "").trim();

    // Strip markdown fences if the model adds them despite instructions
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    const parsed = JSON.parse(text);
    if (!parsed.profile || !parsed.partyBlurbs) throw new Error("unexpected shape");

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Results AI error:", msg);
    return NextResponse.json({ errorCode: "SERVER_ERROR" }, { status: 500 });
  }
}
