"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PARTIES } from "@/lib/parties";
import { TermHint } from "@/components/TermHint";
import UnifiedResultsPage from "@/components/UnifiedResultsPage";

const STATEMENTS = [
  {
    id: 1,
    text: "ישראל צריכה לקדם פתרון שתי מדינות לסכסוך הישראלי-פלסטיני",
    topic: "ביטחון ומדיניות חוץ",
    hint: 'הסדר מדיני שבו יוקמו שתי מדינות נפרדות — ישראל ופלסטין — עם גבולות מוסכמים, בדרך כלל על בסיס קווי 1967.',
  },
  { id: 2, text: "יש להעלות את שכר המינימום משמעותית בשנים הקרובות", topic: "כלכלה" },
  {
    id: 3,
    text: "נישואין אזרחיים צריכים להיות חוקיים בישראל",
    topic: "דת ומדינה",
    hint: 'נישואין המוכרים על ידי המדינה ואינם מחייבים טקס דתי. כיום בישראל, הנישואין מנוהלים אך ורק על ידי הרבנות הראשית (ליהודים) ועל ידי מוסדות דתיים לשאר.',
  },
  { id: 4, text: "הממשלה צריכה להגביר את מימון הדיור הציבורי להשכרה", topic: "דיור" },
  { id: 5, text: "יש לחייב גיוס שווה לצבא לכלל האזרחים, כולל חרדים", topic: "ביטחון ושוויון" },
  {
    id: 6,
    text: "מערכת המשפט ובית המשפט העליון צריכים להישאר עצמאיים מהכנסת",
    topic: "שלטון החוק",
    hint: 'שאלה האם בית המשפט העליון יוכל לפסול חוקי כנסת הפוגעים בזכויות יסוד — או שהכנסת יכולה לעקוף פסיקות אלה. זהו ליבת ה"רפורמה המשפטית" שעמדה בלב המחאה של 2023.',
  },
];

const OPTIONS = [
  { value: 2, label: "מסכים מאוד" },
  { value: 1, label: "מסכים" },
  { value: 0, label: "אין לי עמדה" },
  { value: -1, label: "לא מסכים" },
  { value: -2, label: "לא מסכים בכלל" },
];

// Party positions per statement (order matches lib/parties.ts: hadash, democrats, beyahad, yashar, beitenu, likud, shas)
// Values: -2 (strongly oppose) to +2 (strongly support) on each statement
// Statements: [שתי מדינות, שכר מינימום, נישואין אזרחיים, דיור ציבורי, גיוס חרדים, עצמאות בית משפט]
// NOTE: rough estimates — not verified against current party platforms
const PARTY_POSITIONS: number[][] = [
  [ 2,  2,  2,  2,  1,  2],   // חד"ש-תע"ל
  [ 1,  2,  2,  2,  1,  2],   // הדמוקרטים
  [ 0,  1,  2,  1,  2,  2],   // ביחד (בנט/לפיד)
  [ 0,  1,  1,  1,  2,  1],   // ישר! (איזנקוט)
  [-1,  0,  2,  1,  2,  1],   // ישראל ביתנו
  [-2,  0, -1,  0, -1, -2],   // ליכוד
  [-1,  2, -2,  2, -2, -1],   // ש"ס
];

const ANSWER_LABELS: Record<string, string> = {
  "2": "מסכים מאוד", "1": "מסכים", "0": "אין עמדה", "-1": "לא מסכים", "-2": "לא מסכים בכלל",
};

function buildAnswersSummary(answers: Record<number, number>): string {
  return STATEMENTS
    .filter((s) => answers[s.id] !== undefined)
    .map((s) => `${s.topic}: "${s.text}" — ${ANSWER_LABELS[String(answers[s.id])]}`)
    .join("\n");
}

function matchScore(userAnswers: Record<number, number>) {
  return PARTIES.map((party, pi) => {
    const positions = PARTY_POSITIONS[pi];
    const answered = STATEMENTS.filter((s) => userAnswers[s.id] !== undefined);
    if (answered.length === 0) return { ...party, score: 0 };
    const total = answered.reduce((sum, s) => {
      const diff = Math.abs((userAnswers[s.id] ?? 0) - positions[s.id - 1]);
      return sum + (4 - diff);
    }, 0);
    return { ...party, score: Math.round((total / (answered.length * 4)) * 100) };
  }).sort((a, b) => b.score - a.score);
}

export default function PrototypeA() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);

  const current = STATEMENTS.findIndex((s) => answers[s.id] === undefined);
  const progress = Object.keys(answers).length;

  const removeAnswer = (id: number) =>
    setAnswers((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });

  const goBack = () => {
    if (done) {
      setDone(false);
      removeAnswer(STATEMENTS[STATEMENTS.length - 1].id);
      return;
    }
    if (current === -1) { removeAnswer(STATEMENTS[STATEMENTS.length - 1].id); return; }
    if (current === 0) { router.push("/"); return; }
    removeAnswer(STATEMENTS[current - 1].id);
  };

  if (done) {
    return (
      <UnifiedResultsPage
        results={matchScore(answers)}
        userAnswersSummary={buildAnswersSummary(answers)}
        accentColor="blue"
        onBack={goBack}
      />
    );
  }

  const stmt = current === -1 ? null : STATEMENTS[current];

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="flex justify-between items-center mb-8">
          <button onClick={goBack} className="text-sm text-gray-400 hover:text-gray-600">← חזרה</button>
          <span className="text-sm text-gray-400" dir="ltr">{progress} / {STATEMENTS.length}</span>
        </div>

        <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${(progress / STATEMENTS.length) * 100}%` }} />
        </div>

        {stmt ? (
          <div>
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-2">{stmt.topic}</p>
            {"hint" in stmt && stmt.hint && (
              <div className="mb-4">
                <TermHint definition={stmt.hint} />
              </div>
            )}
            <h2 className="text-2xl font-bold leading-snug mb-10">{stmt.text}</h2>
            <div className="flex flex-col gap-3">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    const next = { ...answers, [stmt.id]: opt.value };
                    setAnswers(next);
                    if (Object.keys(next).length === STATEMENTS.length) setDone(true);
                  }}
                  className="border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl py-4 px-5 text-right font-medium transition-all"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-6">ענית על כל השאלות!</p>
            <button onClick={() => setDone(true)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              ראה תוצאות
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
