"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PARTIES } from "@/lib/parties";
import { TermHint } from "@/components/TermHint";
import UnifiedResultsPage from "@/components/UnifiedResultsPage";

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

function buildAnswersSummary(answers: Record<number, "A" | "B">): string {
  return DILEMMAS
    .filter((d) => answers[d.id] !== undefined)
    .map((d) => {
      const opt = answers[d.id] === "A" ? d.optionA : d.optionB;
      return `${d.topic}: ${opt.label} — ${opt.text}`;
    })
    .join("\n");
}

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
  const [idx, setIdx] = useState(0); // current dilemma index (includes skipped)

  const done = idx >= DILEMMAS.length;
  const current = done ? null : DILEMMAS[idx];

  const goBack = () => {
    if (done) { setIdx(DILEMMAS.length - 1); return; }
    if (idx === 0) { router.push("/"); return; }
    const prevIdx = idx - 1;
    setIdx(prevIdx);
    // remove answer for the dilemma we're going back to, so user can re-answer it
    const prevId = DILEMMAS[prevIdx].id;
    setAnswers((prev) => { const copy = { ...prev }; delete copy[prevId]; return copy; });
  };

  const handleAnswer = (id: number, choice: "A" | "B") => {
    setAnswers((prev) => ({ ...prev, [id]: choice }));
    setIdx((prev) => prev + 1);
  };

  const handleSkip = () => {
    setIdx((prev) => prev + 1); // advance without recording answer
  };

  if (done) {
    return (
      <UnifiedResultsPage
        results={calcResults(answers)}
        userAnswersSummary={buildAnswersSummary(answers)}
        accentColor="amber"
        onBack={goBack}
      />
    );
  }

  if (!current) return null;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="flex justify-between items-center mb-8">
          <button onClick={goBack} className="text-sm text-gray-400 hover:text-gray-600">← חזרה</button>
          <span className="text-sm text-gray-400" dir="ltr">{idx + 1} / {DILEMMAS.length}</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(idx / DILEMMAS.length) * 100}%` }} />
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
            onClick={handleSkip}
            className="w-full text-sm text-gray-500 border border-gray-200 rounded-lg px-4 py-2 hover:border-gray-300 hover:text-gray-600 transition-all text-center"
          >
            דלג על שאלה זו
          </button>
        </div>
      </div>
    </main>
  );
}
