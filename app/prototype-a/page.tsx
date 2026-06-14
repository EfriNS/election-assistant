"use client";

import { useState } from "react";
import Link from "next/link";

const STATEMENTS = [
  { id: 1, text: "ישראל צריכה לקדם פתרון שתי מדינות לסכסוך הישראלי-פלסטיני", topic: "ביטחון ומדיניות חוץ" },
  { id: 2, text: "יש להעלות את שכר המינימום משמעותית בשנים הקרובות", topic: "כלכלה" },
  { id: 3, text: "נישואין אזרחיים צריכים להיות חוקיים בישראל", topic: "דת ומדינה" },
  { id: 4, text: "הממשלה צריכה להגביר את מימון הדיור הציבורי להשכרה", topic: "דיור" },
  { id: 5, text: "יש לחייב גיוס שווה לצבא לכלל האזרחים, כולל חרדים", topic: "ביטחון ושוויון" },
  { id: 6, text: "מערכת המשפט ובית המשפט העליון צריכים להישאר עצמאיים מהכנסת", topic: "שלטון החוק" },
];

const OPTIONS = [
  { value: 2, label: "מסכים מאוד" },
  { value: 1, label: "מסכים" },
  { value: 0, label: "אין לי עמדה" },
  { value: -1, label: "לא מסכים" },
  { value: -2, label: "לא מסכים בכלל" },
];

// Fictional placeholder parties
const PARTIES = [
  { name: "מפלגת השלום", positions: [2, 1, 2, 1, 0, 2] },
  { name: "הבית שלנו", positions: [-2, 0, -1, 0, -1, -2] },
  { name: "המרכז", positions: [0, 1, 1, 1, 1, 1] },
  { name: "ימין חזק", positions: [-1, -1, -2, -1, 2, -2] },
  { name: "מפלגת הרווחה", positions: [1, 2, 0, 2, 1, 1] },
];

function matchScore(userAnswers: Record<number, number>): { name: string; score: number }[] {
  return PARTIES.map((party) => {
    const answered = STATEMENTS.filter((s) => userAnswers[s.id] !== undefined);
    if (answered.length === 0) return { name: party.name, score: 0 };
    const total = answered.reduce((sum, s) => {
      const diff = Math.abs((userAnswers[s.id] ?? 0) - party.positions[s.id - 1]);
      return sum + (4 - diff);
    }, 0);
    return { name: party.name, score: Math.round((total / (answered.length * 4)) * 100) };
  }).sort((a, b) => b.score - a.score);
}

export default function PrototypeA() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);

  const current = STATEMENTS.findIndex((s) => answers[s.id] === undefined);
  const progress = Object.keys(answers).length;

  if (done) {
    const results = matchScore(answers);
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← חזרה</Link>
          <h1 className="text-2xl font-bold mb-2">התוצאות שלך</h1>
          <p className="text-gray-500 text-sm mb-8">על סמך תשובותיך, כך דורגו המפלגות:</p>
          <div className="flex flex-col gap-3">
            {results.map((r, i) => (
              <div key={r.name} className={`rounded-xl p-4 ${i === 0 ? "bg-blue-50 border-2 border-blue-300" : "bg-white border border-gray-200"}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{i + 1}. {r.name}</span>
                  <span className="font-bold text-blue-700">{r.score}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${r.score}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-300 mt-8 text-center">מפלגות פיקטיביות · לצורכי הדגמה בלבד</p>
        </div>
      </main>
    );
  }

  const stmt = current === -1 ? null : STATEMENTS[current];

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← חזרה</Link>
          <span className="text-sm text-gray-400">{progress} / {STATEMENTS.length}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${(progress / STATEMENTS.length) * 100}%` }} />
        </div>

        {stmt ? (
          <div>
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-3">{stmt.topic}</p>
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
