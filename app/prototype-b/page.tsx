"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Topics ───────────────────────────────────────────────────────────────────

const TOPICS = [
  { id: "security", label: "ביטחון ומדיניות חוץ" },
  { id: "economy",  label: "כלכלה ותעסוקה" },
  { id: "housing",  label: "דיור ועלות מחיה" },
  { id: "education",label: "חינוך" },
  { id: "health",   label: "בריאות" },
  { id: "religion", label: "דת ומדינה" },
  { id: "justice",  label: "שלטון החוק ומערכת המשפט" },
  { id: "equality", label: "זכויות אדם ומיעוטים" },
];

// ─── Within-topic priority questions ──────────────────────────────────────────
// Each topic has one question asking what the user wants done, not whether they
// agree with a statement. Four concrete approaches to choose from.

type Option = { id: string; text: string; scores: number[] }; // scores = [peace, home, center, right, welfare]
type TopicQ = { question: string; options: Option[] };

const PRIORITY_QUESTIONS: Record<string, TopicQ> = {
  security: {
    question: "מה הגישה הנכונה לחיזוק הביטחון של ישראל?",
    options: [
      { id: "force",     text: "עוצמה צבאית והרתעה — כוח הוא השפה היחידה שמבינים",           scores: [-2, 2, 0, 2, -1] },
      { id: "diplomacy", text: "הסכמי שלום ופתרון מדיני — ביטחון אמיתי מגיע מהסדרים",         scores: [2, -2, 1, -2, 1] },
      { id: "borders",   text: "שמירה קפדנית על גבולות — לא מלחמה, לא ויתורים",               scores: [0, 1, 2, 1, 0] },
      { id: "regional",  text: "שיתוף פעולה אזורי ונורמליזציה — קואליציה נגד איומים משותפים", scores: [1, 0, 1, 0, 1] },
    ],
  },
  economy: {
    question: "מה הכי דחוף לשפר מבחינה כלכלית?",
    options: [
      { id: "wages",   text: "העלאת שכר המינימום ושיפור תנאי העובדים",          scores: [1, -1, 0, -2, 2] },
      { id: "taxes",   text: "הפחתת מיסים לעסקים כדי לעודד צמיחה ותעסוקה",     scores: [-1, 2, 1, 2, -2] },
      { id: "welfare", text: "הרחבת רשת הביטחון הסוציאלי לחלשים",              scores: [1, -2, 0, -2, 2] },
      { id: "infra",   text: "השקעה בתשתיות וטכנולוגיה לצמיחה ארוכת טווח",    scores: [0, 1, 2, 0, 1] },
    ],
  },
  housing: {
    question: "מה הדרך הנכונה לפתור את משבר הדיור?",
    options: [
      { id: "public",     text: "בנייה ציבורית ממשלתית בהיקף גדול להשכרה במחיר מפוקח",   scores: [1, -2, 0, -2, 2] },
      { id: "market",     text: "תמריצי שוק ומענקים לרוכשי דירה ראשונה",                 scores: [-1, 2, 1, 2, -1] },
      { id: "bureaucracy",text: "פישוט בירוקרטיה ויעול תהליכי תכנון ובנייה",              scores: [0, 1, 2, 1, 0] },
      { id: "investors",  text: "מיסוי על דירות ריקות ומשקיעים מרובי נכסים",              scores: [1, -2, 0, -1, 2] },
    ],
  },
  education: {
    question: "מה עדיפות ראשונה במדיניות החינוך?",
    options: [
      { id: "funding",   text: "מימון ציבורי מוגבר לכלל מוסדות החינוך",            scores: [1, -1, 1, -1, 2] },
      { id: "uniform",   text: "תוכנית לימודים אחידה לכל ילד, ללא יוצא מן הכלל",  scores: [0, 0, 1, 1, 0] },
      { id: "autonomy",  text: "אוטונומיה מגזרית — כל קהילה מנהלת את חינוכה",     scores: [-1, 1, 0, 1, -1] },
      { id: "higher",    text: "השקעה בהשכלה גבוהה ומחקר לחיזוק הכלכלה",          scores: [1, 2, 2, 1, 1] },
    ],
  },
  health: {
    question: "מה הפתרון הנכון למשבר הבריאות?",
    options: [
      { id: "basket",   text: "הרחבת משמעותית של סל הבריאות הציבורי",          scores: [1, -1, 1, -1, 2] },
      { id: "digital",  text: "דיגיטציה ויעול לקיצור תורים ושיפור נגישות",     scores: [0, 1, 2, 1, 0] },
      { id: "doctors",  text: "תמרוץ רופאים ואחיות למנוע עזיבה לחו\"ל",        scores: [1, 0, 1, 0, 1] },
      { id: "private",  text: "פתיחה לתחרות פרטית כדי לשפר איכות שירות",      scores: [-1, 2, 0, 2, -2] },
    ],
  },
  religion: {
    question: "מהי העמדה הנכונה בשאלת דת ומדינה?",
    options: [
      { id: "separate", text: "הפרדת דת ומדינה מלאה — נישואין אזרחיים, תחבורה בשבת",    scores: [2, -2, 1, -2, 2] },
      { id: "statusquo",text: "שמירה על הסטטוס קוו הדתי הקיים",                          scores: [-1, 1, 0, 1, -1] },
      { id: "pluralism",text: "הכרה בכל הזרמים היהודיים — רפורמי, קונסרבטיבי, חילוני",   scores: [2, -1, 1, -1, 1] },
      { id: "services", text: "שיפור שירותי הדת הקיימים ללא שינוי המדיניות",              scores: [-1, 0, 0, 1, 0] },
    ],
  },
  justice: {
    question: "מה הגישה הנכונה לסוגיית מערכת המשפט?",
    options: [
      { id: "independent",text: "עצמאות מלאה לבית המשפט — ללא מגבלות על סמכות הביקורת",  scores: [2, -2, 1, -2, 1] },
      { id: "accountable",text: "שינוי אופן מינוי שופטים לשיקוף רחב יותר של הציבור",    scores: [-1, 1, 0, 2, -1] },
      { id: "consensus",  text: "רפורמה מוסכמת בלבד — שינויים רק בהסכמה רחבה",           scores: [1, 0, 2, 0, 1] },
      { id: "knesset",    text: "עיקרון ריבונות הכנסת — הנבחרים ימשלו ללא וטו שיפוטי",  scores: [-2, 2, -1, 2, -1] },
    ],
  },
  equality: {
    question: "מה הצעד החשוב ביותר לקידום שוויון?",
    options: [
      { id: "law",       text: "חוק שוויון מפורש לכל אזרח, ללא הבחנה",                       scores: [2, -1, 1, -2, 2] },
      { id: "represent", text: "הגברת ייצוג מגזרים מוחלשים בגופים ציבוריים ובצבא",          scores: [1, -1, 1, -1, 2] },
      { id: "character", text: "שמירה על האופי היהודי-דמוקרטי תוך שוויון אישי",             scores: [0, 1, 1, 2, 0] },
      { id: "lgbtq",     text: "שוויון מלא לקהילת הלהט\"ב, כולל נישואין",                   scores: [2, -2, 1, -2, 2] },
    ],
  },
};

// ─── Party matching ────────────────────────────────────────────────────────────
// scores index: [peace, home, center, right, welfare]
const PARTY_NAMES = ["מפלגת השלום", "הבית שלנו", "המרכז", "ימין חזק", "מפלגת הרווחה"];

function calcResults(ranked: string[], answers: Record<string, string>) {
  const totals = [0, 0, 0, 0, 0];
  const weights = [0, 0, 0, 0, 0];

  ranked.forEach((topicId, rankIndex) => {
    const weight = ranked.length - rankIndex; // top-ranked topic gets highest weight
    const chosenId = answers[topicId];
    const option = PRIORITY_QUESTIONS[topicId]?.options.find((o) => o.id === chosenId);
    if (!option) return;
    option.scores.forEach((score, pi) => {
      totals[pi] += weight * score;
      weights[pi] += weight * 2; // max possible contribution
    });
  });

  return PARTY_NAMES.map((name, i) => ({
    name,
    score: weights[i] > 0 ? Math.round(((totals[i] + weights[i]) / (2 * weights[i])) * 100) : 50,
  })).sort((a, b) => b.score - a.score);
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = "rank" | "questions" | "results";

export default function PrototypeB() {
  const [step, setStep] = useState<Step>("rank");
  // ranked = ordered list of selected topic IDs (index 0 = top priority)
  const [ranked, setRanked] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // ── Ranking phase ──────────────────────────────────────────────────────────
  const toggleTopic = (id: string) => {
    if (ranked.includes(id)) {
      setRanked(ranked.filter((r) => r !== id));
    } else if (ranked.length < 4) {
      setRanked([...ranked, id]);
    }
  };

  if (step === "rank") {
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← חזרה</Link>
          <h1 className="text-2xl font-bold mb-2">מה חשוב לך?</h1>
          <p className="text-gray-500 text-sm mb-2 leading-relaxed">
            בחר עד 4 נושאים שחשובים לך, <strong>לפי סדר חשיבות</strong>.
            הנושא הראשון שתלחץ עליו יהיה העדיפות הגבוהה ביותר שלך.
          </p>
          <p className="text-xs text-gray-400 mb-8">לחץ על נושא כדי לבחור אותו; לחץ שוב כדי להסיר.</p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {TOPICS.map((t) => {
              const rank = ranked.indexOf(t.id);
              const selected = rank !== -1;
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTopic(t.id)}
                  className={`relative border-2 rounded-xl p-4 text-right transition-all ${
                    selected
                      ? "border-emerald-500 bg-emerald-50"
                      : ranked.length >= 4
                      ? "border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed"
                      : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                >
                  {selected && (
                    <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      {rank + 1}
                    </span>
                  )}
                  <span className="text-sm font-medium leading-snug">{t.label}</span>
                </button>
              );
            })}
          </div>

          {ranked.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 font-medium mb-2">סדר העדיפויות שלך:</p>
              <ol className="space-y-1">
                {ranked.map((id, i) => (
                  <li key={id} className="text-sm text-gray-700">
                    <span className="font-bold text-emerald-600">{i + 1}.</span>{" "}
                    {TOPICS.find((t) => t.id === id)?.label}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button
            onClick={() => setStep("questions")}
            disabled={ranked.length < 2}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40"
          >
            {ranked.length < 2
              ? `בחר לפחות 2 נושאים (נבחרו ${ranked.length})`
              : `המשך — ${ranked.length} נושאים נבחרו`}
          </button>
        </div>
      </main>
    );
  }

  // ── Question phase ─────────────────────────────────────────────────────────
  if (step === "questions") {
    const topicId = ranked[questionIndex];
    const topic = TOPICS.find((t) => t.id === topicId)!;
    const q = PRIORITY_QUESTIONS[topicId];

    const handleAnswer = (optionId: string) => {
      const next = { ...answers, [topicId]: optionId };
      setAnswers(next);
      if (questionIndex + 1 < ranked.length) {
        setQuestionIndex(questionIndex + 1);
      } else {
        setStep("results");
      }
    };

    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="flex justify-between items-center mb-8">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← חזרה</Link>
            <span className="text-sm text-gray-400">{questionIndex + 1} / {ranked.length}</span>
          </div>

          <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${((questionIndex) / ranked.length) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-white bg-emerald-600 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
              {questionIndex + 1}
            </span>
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">{topic.label}</p>
          </div>
          <h2 className="text-xl font-bold leading-snug mb-8">{q.question}</h2>

          <div className="flex flex-col gap-3">
            {q.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleAnswer(opt.id)}
                className="border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-xl py-4 px-5 text-right font-medium text-sm leading-snug transition-all"
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── Results phase ──────────────────────────────────────────────────────────
  const results = calcResults(ranked, answers);
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← חזרה</Link>
        <h1 className="text-2xl font-bold mb-2">התוצאות שלך</h1>
        <p className="text-gray-500 text-sm mb-1">
          המשקל ניתן לפי סדר העדיפויות שבחרת:
        </p>
        <ol className="text-xs text-gray-400 mb-6 list-decimal list-inside">
          {ranked.map((id) => (
            <li key={id}>{TOPICS.find((t) => t.id === id)?.label}</li>
          ))}
        </ol>

        <div className="flex flex-col gap-3">
          {results.map((r, i) => (
            <div
              key={r.name}
              className={`rounded-xl p-4 ${i === 0 ? "bg-emerald-50 border-2 border-emerald-300" : "bg-white border border-gray-200"}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{i + 1}. {r.name}</span>
                <span className="font-bold text-emerald-700">{r.score}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${r.score}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-300 mt-8 text-center">מפלגות פיקטיביות · לצורכי הדגמה בלבד</p>
      </div>
    </main>
  );
}
