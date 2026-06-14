"use client";

import { useState } from "react";
import Link from "next/link";

const TOPICS = [
  { id: "security", label: "ביטחון לאומי" },
  { id: "economy", label: "כלכלה ותעסוקה" },
  { id: "housing", label: "דיור ועלות מחיה" },
  { id: "education", label: "חינוך" },
  { id: "health", label: "בריאות" },
  { id: "religion", label: "דת ומדינה" },
  { id: "justice", label: "שלטון החוק ומערכת המשפט" },
  { id: "equality", label: "זכויות אדם ומיעוטים" },
];

const QUESTIONS: Record<string, { text: string }[]> = {
  security: [
    { text: "ישראל צריכה לשאוף להסכם שלום עם הפלסטינים גם במחיר של ויתורים טריטוריאליים" },
    { text: "הצבא צריך להיות הגורם המרכזי בקביעת מדיניות הביטחון" },
    { text: "הסכמי נורמליזציה עם מדינות ערב צריכים להיות עדיפות דיפלומטית עליונה" },
  ],
  economy: [
    { text: "יש להעלות את שכר המינימום משמעותית" },
    { text: "הממשלה צריכה להפחית מיסים על עסקים כדי לעודד צמיחה" },
    { text: "יש להגביר את הרגולציה על חברות טכנולוגיה גדולות" },
  ],
  housing: [
    { text: "הממשלה צריכה לבנות עשרות אלפי דירות ציבוריות להשכרה" },
    { text: "יש לאפשר בנייה רבה יותר בשכונות קיימות גם ללא הסכמת הדיירים" },
    { text: "יש להטיל מס על דירות ריקות ומשקיעים מרובי נכסים" },
  ],
  education: [
    { text: "יש להגביר את מימון הממשלה לחינוך הציבורי" },
    { text: "הוראת אנגלית ומתמטיקה צריכה להיות חובה בכל בתי הספר, כולל חרדים וערבים" },
    { text: "יש לאפשר מערכת חינוך פרטית מסובסדת כחלופה לחינוך הציבורי" },
  ],
  health: [
    { text: "יש להרחיב את סל הבריאות הציבורי משמעותית" },
    { text: "הממשלה צריכה לאסור על ביטוחי בריאות פרטיים שמוציאים חולים מהמערכת הציבורית" },
    { text: "יש לפתוח את שוק הבריאות לתחרות פרטית כדי לשפר שירות" },
  ],
  religion: [
    { text: "נישואין אזרחיים צריכים להיות חוקיים בישראל" },
    { text: "עסקים צריכים להיות רשאים לפעול בשבת" },
    { text: "מוסדות דת לא צריכים לקבל מימון ממשלתי" },
  ],
  justice: [
    { text: "בית המשפט העליון צריך לשמור על סמכות לפסול חוקי כנסת" },
    { text: "מינוי שופטים צריך להיות בידי הממשלה הנבחרת" },
    { text: "יש להגביל את כהונת ראש הממשלה לשתי קדנציות" },
  ],
  equality: [
    { text: "ישראל צריכה לחוקק חוק שוויון מפורש לכל אזרחיה" },
    { text: "יש להגביר ייצוג של מיעוטים בגופים ממשלתיים ובצבא" },
    { text: "קהילת הלהט\"ב צריכה לקבל את אותן זכויות נישואין כמו כולם" },
  ],
};

const PARTIES = [
  { name: "מפלגת השלום", scores: { security: 2, economy: 1, housing: 2, education: 1, health: 2, religion: 2, justice: 2, equality: 2 } },
  { name: "הבית שלנו", scores: { security: -2, economy: -1, housing: -1, education: 0, health: 0, religion: -2, justice: -2, equality: -1 } },
  { name: "המרכז", scores: { security: 0, economy: 1, housing: 1, education: 1, health: 1, religion: 0, justice: 1, equality: 1 } },
  { name: "ימין חזק", scores: { security: -2, economy: -1, housing: -1, education: 0, health: -1, religion: -2, justice: -2, equality: -2 } },
  { name: "מפלגת הרווחה", scores: { security: 1, economy: 2, housing: 2, education: 2, health: 2, religion: 0, justice: 1, equality: 2 } },
];

type Step = "priorities" | "questions" | "results";

function calcResults(importance: Record<string, number>, answers: Record<string, number[]>) {
  return PARTIES.map((party) => {
    let weighted = 0, totalWeight = 0;
    TOPICS.forEach((t) => {
      const w = importance[t.id] ?? 0;
      if (w === 0) return;
      const qs = QUESTIONS[t.id];
      const ans = answers[t.id] ?? [];
      if (ans.length === 0) return;
      const avg = ans.reduce((s, a) => s + a, 0) / ans.length;
      const partyAvg = (party.scores as Record<string, number>)[t.id];
      const diff = Math.abs(avg - partyAvg);
      weighted += w * (4 - diff);
      totalWeight += w * 4;
    });
    return { name: party.name, score: totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0 };
  }).sort((a, b) => b.score - a.score);
}

export default function PrototypeB() {
  const [step, setStep] = useState<Step>("priorities");
  const [importance, setImportance] = useState<Record<string, number>>({});
  const [topicIndex, setTopicIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});

  const topTopics = [...TOPICS]
    .filter((t) => (importance[t.id] ?? 0) > 0)
    .sort((a, b) => (importance[b.id] ?? 0) - (importance[a.id] ?? 0))
    .slice(0, 3);

  const currentTopic = topTopics[topicIndex];
  const currentQuestions = currentTopic ? QUESTIONS[currentTopic.id] : [];
  const currentQ = currentQuestions[questionIndex];

  const handleAnswer = (val: number) => {
    const prev = answers[currentTopic.id] ?? [];
    const next = { ...answers, [currentTopic.id]: [...prev, val] };
    setAnswers(next);
    if (questionIndex + 1 < currentQuestions.length) {
      setQuestionIndex(questionIndex + 1);
    } else if (topicIndex + 1 < topTopics.length) {
      setTopicIndex(topicIndex + 1);
      setQuestionIndex(0);
    } else {
      setStep("results");
    }
  };

  if (step === "priorities") {
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← חזרה</Link>
          <h1 className="text-2xl font-bold mb-2">מה חשוב לך?</h1>
          <p className="text-gray-500 text-sm mb-8">דרג כמה כל נושא חשוב לך. נשאל אותך רק על הנושאים שסימנת כחשובים.</p>
          <div className="flex flex-col gap-4">
            {TOPICS.map((t) => {
              const val = importance[t.id] ?? 0;
              return (
                <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium">{t.label}</span>
                    <span className="text-sm font-bold text-emerald-700">
                      {val === 0 ? "לא חשוב" : val === 1 ? "חשוב" : val === 2 ? "חשוב מאוד" : "עדיפות ראשונה"}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={3} step={1} value={val}
                    onChange={(e) => setImportance({ ...importance, [t.id]: +e.target.value })}
                    className="w-full accent-emerald-500"
                  />
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setStep("questions")}
            disabled={topTopics.length === 0}
            className="mt-8 w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40"
          >
            המשך לשאלות ({topTopics.length} נושאים נבחרו)
          </button>
        </div>
      </main>
    );
  }

  if (step === "questions" && currentQ) {
    const totalQuestions = topTopics.reduce((s, t) => s + QUESTIONS[t.id].length, 0);
    const answered = topTopics.slice(0, topicIndex).reduce((s, t) => s + QUESTIONS[t.id].length, 0) + questionIndex;
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="flex justify-between items-center mb-8">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← חזרה</Link>
            <span className="text-sm text-gray-400">{answered + 1} / {totalQuestions}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(answered / totalQuestions) * 100}%` }} />
          </div>
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-3">{currentTopic.label}</p>
          <h2 className="text-2xl font-bold leading-snug mb-10">{currentQ.text}</h2>
          <div className="flex flex-col gap-3">
            {[{ v: 2, l: "מסכים מאוד" }, { v: 1, l: "מסכים" }, { v: 0, l: "אין לי עמדה" }, { v: -1, l: "לא מסכים" }, { v: -2, l: "לא מסכים בכלל" }].map((o) => (
              <button key={o.v} onClick={() => handleAnswer(o.v)}
                className="border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-xl py-4 px-5 text-right font-medium transition-all">
                {o.l}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (step === "results") {
    const results = calcResults(importance, answers);
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← חזרה</Link>
          <h1 className="text-2xl font-bold mb-2">התוצאות שלך</h1>
          <p className="text-gray-500 text-sm mb-8">המשקל ניתן לנושאים שסימנת כחשובים לך.</p>
          <div className="flex flex-col gap-3">
            {results.map((r, i) => (
              <div key={r.name} className={`rounded-xl p-4 ${i === 0 ? "bg-emerald-50 border-2 border-emerald-300" : "bg-white border border-gray-200"}`}>
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

  return null;
}
