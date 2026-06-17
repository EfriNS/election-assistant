"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PARTIES } from "@/lib/parties";
import PartyResultCard from "@/components/PartyResultCard";
import { TermHint } from "@/components/TermHint";

const DILEMMAS = [
  {
    id: 1,
    topic: "דיור",
    question: "הממשלה מתלבטת בין שתי גישות לפתרון משבר הדיור:",
    optionA: { label: "בנייה ציבורית", text: "לבנות עשרות אלפי דירות ציבוריות להשכרה במחיר מפוקח" },
    optionB: { label: "תמריצי שוק", text: "לתת הטבות מס ומענקים לרוכשי דירה ראשונה בשוק החופשי" },
    hint: '"שוק חופשי" — מודל כלכלי שבו מחירי הדיור נקבעים לפי היצע וביקוש, ללא תקרת מחיר ממשלתית. "בנייה ציבורית" — המדינה בונה ומשכירה דירות במחיר נמוך מהשוק.',
  },
  {
    id: 2,
    topic: "ביטחון ועתיד עזה",
    question: "מה צריך לקרות בעזה לאחר סיום הלחימה?",
    optionA: { label: "שלטון בינלאומי", text: "הקמת ממשל בינלאומי-ערבי זמני בעזה, ללא נוכחות צבאית ישראלית קבועה" },
    optionB: { label: "שליטה ישראלית", text: "ישראל שומרת על שליטה ביטחונית מלאה בעזה לטווח ארוך, עד להסדר מדיני קבוע" },
    hint: '"ממשל בינלאומי-ערבי זמני" — ניהול הרצועה על ידי קואליציה של מדינות זרות (כגון מדינות ערב או האו"ם), עד להקמת שלטון פלסטיני עצמאי.',
  },
  {
    id: 3,
    topic: "גיוס",
    question: "בשאלת גיוס החרדים לצבא:",
    optionA: { label: "חובה מיידית", text: "לחייב גיוס שווה לאלתר, ללא הסדרים מיוחדים" },
    optionB: { label: "מדורג עם תמריצים", text: "לקדם הסדרים מדורגים עם תמריצים כלכליים ותרבותיים" },
  },
  {
    id: 4,
    topic: "שפיטה",
    question: "בנושא כוחו של בית המשפט העליון:",
    optionA: { label: "עצמאות מלאה", text: "לאפשר לבית המשפט לפסול כל חוק שמנוגד לזכויות יסוד" },
    optionB: { label: "פיקוח של הכנסת", text: "לאפשר לכנסת לעקוף פסיקות בית המשפט ברוב מיוחד" },
  },
  {
    id: 5,
    topic: "אנרגיה",
    question: "כיצד ישראל צריכה לענות על צרכי האנרגיה שלה?",
    optionA: { label: "אנרגיה ירוקה", text: "להשקיע מאסיבית בסולרי ורוח, גם במחיר עליית מחירי החשמל בטווח הקצר" },
    optionB: { label: "גז טבעי", text: "להמשיך להסתמך על גז טבעי מקומי תוך מעבר הדרגתי לאנרגיה מתחדשת" },
  },
  {
    id: 6,
    topic: "חינוך",
    question: "מה צריכה להיות מדיניות החינוך כלפי מגזרים שונים?",
    optionA: { label: "תוכנית אחידה", text: "להחיל תוכנית לימודים אחידה בכל בתי הספר, כולל חרדים וערבים" },
    optionB: { label: "אוטונומיה מגזרית", text: "לאפשר לכל מגזר לנהל את החינוך שלו בתמיכה ממשלתית" },
  },
];

// Party leanings per dilemma (order matches lib/parties.ts: hadash, democrats, beyahad, yashar, beitenu, likud, shas)
// 0 = strongly optionA, 1 = strongly optionB, 0.5 = neutral
// NOTE: rough estimates — not verified against current party platforms
const PARTY_LEANINGS: number[][] = [
  [0,   0,   0.5, 0.5, 1,   1,   0  ], // דיור
  [0,   0,   0,   0.5, 1,   1,   1  ], // עזה
  [0.5, 0,   0,   0,   0,   0.5, 1  ], // גיוס
  [0,   0,   0,   0.5, 0,   1,   1  ], // שפיטה
  [0,   0,   0.5, 0.5, 1,   1,   0.5], // אנרגיה
  [0.5, 0,   0,   0,   0,   0.5, 1  ], // חינוך
];

function calcResults(answers: Record<number, "A" | "B">) {
  const vals = DILEMMAS.map((d) => (answers[d.id] === "A" ? 0 : answers[d.id] === "B" ? 1 : 0.5));
  return PARTIES.map((party, pi) => {
    const answered = DILEMMAS.filter((d) => answers[d.id] !== undefined);
    if (answered.length === 0) return { ...party, score: 0 };
    const match = answered.reduce((s, d) => {
      const idx = DILEMMAS.indexOf(d);
      return s + (1 - Math.abs(vals[idx] - PARTY_LEANINGS[idx][pi]));
    }, 0);
    return { ...party, score: Math.round((match / answered.length) * 100) };
  }).sort((a, b) => b.score - a.score);
}

export default function PrototypeC() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, "A" | "B">>({});
  const [done, setDone] = useState(false);

  const answered = Object.keys(answers).length;
  const current = DILEMMAS.find((d) => answers[d.id] === undefined);

  const removeAnswer = (id: number) =>
    setAnswers((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });

  const goBack = () => {
    if (done) {
      setDone(false);
      removeAnswer(DILEMMAS[DILEMMAS.length - 1].id);
      return;
    }
    if (answered === 0) { router.push("/"); return; }
    removeAnswer(DILEMMAS[answered - 1].id);
  };

  const handleAnswer = (id: number, choice: "A" | "B") => {
    const next = { ...answers, [id]: choice };
    setAnswers(next);
    if (Object.keys(next).length === DILEMMAS.length) setDone(true);
  };

  if (done) {
    const results = calcResults(answers);
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <button onClick={goBack} className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← חזרה</button>
          <h1 className="text-2xl font-bold mb-2">התוצאות שלך</h1>
          <p className="text-gray-500 text-sm mb-4">על סמך הבחירות שעשית בדילמות:</p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-xs text-gray-500 leading-relaxed">
            <strong>שיטת החישוב:</strong> הציונות מבוסס על הערכה ידנית של עמדות ציבוריות ידועות — לא על ניתוח אוטומטי של תוכניות מפלגה עדכניות. עמדות המפלגות החדשות (ביחד, ישר!) הן הערכה בלבד.
          </div>
          <div className="flex flex-col gap-3">
            {results.map((r, i) => (
              <PartyResultCard key={r.id} party={r} rank={i} accentColor="amber" />
            ))}
          </div>
          <p className="text-xs text-gray-300 mt-8 text-center">המידע מבוסס על עמדות ציבוריות ידועות · עשוי להיות לא מדויק</p>
        </div>
      </main>
    );
  }

  if (!current) return null;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="flex justify-between items-center mb-8">
          <button onClick={goBack} className="text-sm text-gray-400 hover:text-gray-600">← חזרה</button>
          <span className="text-sm text-gray-400">{answered + 1} / {DILEMMAS.length}</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(answered / DILEMMAS.length) * 100}%` }} />
        </div>

        <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-2">{current.topic}</p>
        {"hint" in current && current.hint && (
          <div className="mb-4">
            <TermHint definition={current.hint} />
          </div>
        )}
        <h2 className="text-xl font-bold leading-snug mb-8">{current.question}</h2>

        <div className="flex flex-col gap-4">
          {(["A", "B"] as const).map((choice) => {
            const opt = choice === "A" ? current.optionA : current.optionB;
            return (
              <button
                key={choice}
                onClick={() => handleAnswer(current.id, choice)}
                className="border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 rounded-2xl p-6 text-right transition-all"
              >
                <span className="block text-xs font-bold text-amber-600 mb-1">{opt.label}</span>
                <span className="block text-base font-medium leading-snug">{opt.text}</span>
              </button>
            );
          })}
          <button
            onClick={() => handleAnswer(current.id, "A")}
            className="text-sm text-gray-400 hover:text-gray-600 text-center py-2"
          >
            דלג על שאלה זו
          </button>
        </div>
      </div>
    </main>
  );
}
