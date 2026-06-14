"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Topics ───────────────────────────────────────────────────────────────────

const TOPICS = [
  { id: "security",  label: "ביטחון ומדיניות חוץ" },
  { id: "economy",   label: "כלכלה ותעסוקה" },
  { id: "housing",   label: "דיור ועלות מחיה" },
  { id: "education", label: "חינוך" },
  { id: "health",    label: "בריאות" },
  { id: "religion",  label: "דת ומדינה" },
  { id: "justice",   label: "שלטון החוק ומערכת המשפט" },
  { id: "equality",  label: "זכויות אדם ומיעוטים" },
];

// ─── Within-topic value questions ─────────────────────────────────────────────
// Each question asks what the user cares about most / what worries them most
// within the topic — NOT which policy they prefer.

type Option = { id: string; text: string; scores: number[] }; // [peace, home, center, right, welfare]
type TopicQ = { question: string; options: Option[] };

const PRIORITY_QUESTIONS: Record<string, TopicQ> = {
  security: {
    question: "בתחום הביטחון — מה הכי מדאיג אותך?",
    options: [
      { id: "attacks",  text: "הגנה מיידית — עצירת הרקטות, המנהרות, והמתקפות",          scores: [-1, 2, 0, 2, -1] },
      { id: "peace",    text: "הסדר קבוע — שלא נחיה בלופ של מלחמות ללא סוף",             scores: [2, -2, 1, -2, 1] },
      { id: "autonomy", text: "עצמאות — שלא נהיה תלויים לצמיתות בנשק ותמיכה מחו\"ל",    scores: [0, 1, 2, 1, 0] },
      { id: "image",    text: "מעמד ישראל — שלא נהפוך לפריה בינלאומית",                  scores: [1, 0, 1, -1, 1] },
    ],
  },
  economy: {
    question: "בכלכלה — מה הכי מכביד עליך?",
    options: [
      { id: "costliving", text: "יוקר המחיה — המשכורת לא מגיעה לסוף החודש",              scores: [1, -1, 0, -1, 2] },
      { id: "future",     text: "עתיד הדור הצעיר — קשה להסתדר בלי עזרה מההורים",         scores: [1, -1, 1, -1, 2] },
      { id: "inequality", text: "פערים — הבוגרים מתעשרים, הפועלים נסגרים",               scores: [1, -2, 0, -2, 2] },
      { id: "growth",     text: "עצירת הצמיחה — ישראל מפגרת כלכלית מהיכולת שלה",        scores: [-1, 2, 2, 2, -1] },
    ],
  },
  housing: {
    question: "בדיור — מה הכי לוחץ אצלך?",
    options: [
      { id: "rent",     text: "שכירות — שכר הדירה גבוה ואי אפשר לחסוך",                  scores: [1, -1, 0, -1, 2] },
      { id: "buy",      text: "רכישה — דירה היא חלום שהדור הצעיר לא יכול להרשות",        scores: [0, 1, 1, 1, 0] },
      { id: "location", text: "מיקום — רוצה לגור קרוב לעבודה, לא בפריפריה",              scores: [0, 0, 2, 0, 1] },
      { id: "homeless", text: "חסרי דיור — שיש אנשים ישנים ברחוב זה בלתי נסלח",          scores: [1, -2, 0, -1, 2] },
    ],
  },
  education: {
    question: "בחינוך — מה הכי חשוב לך?",
    options: [
      { id: "quality", text: "איכות — מורים מעולים שמשתכרים בהתאם",                      scores: [1, 0, 2, 0, 2] },
      { id: "equal",   text: "שוויון — כל ילד מקבל אותה הזדמנות, ללא קשר לרקע",          scores: [2, -1, 1, -1, 2] },
      { id: "values",  text: "ערכים — בית ספר שמעביר זהות, מורשת, ולאום",                scores: [-1, 1, 0, 2, -1] },
      { id: "skills",  text: "כישורים — הכנה אמיתית לשוק העבודה של המאה ה-21",           scores: [0, 2, 2, 1, 1] },
    ],
  },
  health: {
    question: "בבריאות — מה הכי מדאיג אותך?",
    options: [
      { id: "wait",    text: "תורים — חודשים להמתין לרופא מומחה זה מסכן חיים",            scores: [0, 1, 2, 1, 1] },
      { id: "cost",    text: "עלות — טיפולים שלא בסל עולים הון שאין לכולם",              scores: [1, -1, 0, -1, 2] },
      { id: "doctors", text: "בריחת רופאים — הרפואה הטובה עוזבת לחו\"ל",                 scores: [1, 0, 1, 0, 1] },
      { id: "gaps",    text: "פערים — ביישובים מסוימים הרפואה הרבה יותר גרועה",           scores: [1, -1, 0, -1, 2] },
    ],
  },
  religion: {
    question: "בדת ומדינה — מה הכי מפריע לך?",
    options: [
      { id: "coercion",  text: "כפייה — אני רוצה לחיות לפי ערכיי, לא לפי הרבנות",        scores: [2, -2, 1, -2, 2] },
      { id: "identity",  text: "זהות — מדינת ישראל מאבדת את אופייה היהודי",               scores: [-2, 1, 0, 2, -1] },
      { id: "pluralism", text: "הכרה — הזרם הדתי שלי (רפורמי/קונסרבטיבי) לא מוכר",       scores: [2, -1, 1, -1, 1] },
      { id: "marriage",  text: "נישואין — אי אפשר להינשא אזרחית בישראל",                  scores: [2, -2, 1, -2, 2] },
    ],
  },
  justice: {
    question: "במערכת המשפט — מה הכי חשוב לך?",
    options: [
      { id: "independence", text: "עצמאות — שופטים שלא תלויים בפוליטיקאים שמינו אותם",   scores: [2, -2, 1, -2, 1] },
      { id: "oversight",    text: "ביקורת — גם בית המשפט צריך מישהו שיאזן אותו",          scores: [-1, 2, 0, 2, -1] },
      { id: "consensus",    text: "יציבות — שינויים משפטיים רק בהסכמה רחבה",              scores: [1, 0, 2, 0, 1] },
      { id: "diversity",    text: "ייצוג — בית המשפט צריך לשקף את כל הציבור הישראלי",    scores: [0, 1, 1, 1, 0] },
    ],
  },
  equality: {
    question: "בזכויות אדם ושוויון — מה הכי חשוב לך?",
    options: [
      { id: "law",       text: "חוק ברור — הגנה משפטית מפורשת מפני אפליה",               scores: [2, -1, 1, -2, 2] },
      { id: "represent", text: "ייצוג — מיעוטים חייבים להיות חלק ממוסדות המדינה",         scores: [1, -1, 1, -1, 2] },
      { id: "character", text: "אופי יהודי — שמירת הרוב היהודי והאופי הלאומי",            scores: [-1, 1, 0, 2, -1] },
      { id: "lgbtq",     text: "LGBTQ+ — כולם ראויים לחיות בכבוד וללא אפליה",             scores: [2, -2, 1, -2, 2] },
    ],
  },
};

// ─── Party matching ────────────────────────────────────────────────────────────

const PARTY_NAMES = ["מפלגת השלום", "הבית שלנו", "המרכז", "ימין חזק", "מפלגת הרווחה"];

function calcResults(ranked: string[], answers: Record<string, string>) {
  const totals = [0, 0, 0, 0, 0];
  const weights = [0, 0, 0, 0, 0];

  ranked.forEach((topicId, rankIndex) => {
    const weight = ranked.length - rankIndex;
    const chosenId = answers[topicId];
    const option = PRIORITY_QUESTIONS[topicId]?.options.find((o) => o.id === chosenId);
    if (!option) return;
    option.scores.forEach((score, pi) => {
      totals[pi] += weight * score;
      weights[pi] += weight * 2;
    });
  });

  return PARTY_NAMES.map((name, i) => ({
    name,
    score: weights[i] > 0 ? Math.round(((totals[i] + weights[i]) / (2 * weights[i])) * 100) : 50,
  })).sort((a, b) => b.score - a.score);
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = "rank" | "questions" | "results";

const MIN_TOPICS = 3;

export default function PrototypeB() {
  const [step, setStep] = useState<Step>("rank");
  const [ranked, setRanked] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const toggleTopic = (id: string) => {
    if (ranked.includes(id)) {
      setRanked(ranked.filter((r) => r !== id));
    } else {
      setRanked([...ranked, id]);
    }
  };

  // ── Ranking phase ──────────────────────────────────────────────────────────
  if (step === "rank") {
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← חזרה</Link>
          <h1 className="text-2xl font-bold mb-2">מה חשוב לך?</h1>
          <p className="text-gray-500 text-sm mb-2 leading-relaxed">
            בחר לפחות {MIN_TOPICS} נושאים שחשובים לך, <strong>לפי סדר חשיבות</strong>.
            הנושא הראשון שתלחץ עליו יהיה העדיפות הגבוהה ביותר שלך.
          </p>
          <p className="text-xs text-gray-400 mb-8">לחץ שוב על נושא כדי להסיר אותו.</p>

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
            onClick={() => { setQuestionIndex(0); setStep("questions"); }}
            disabled={ranked.length < MIN_TOPICS}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40"
          >
            {ranked.length < MIN_TOPICS
              ? `בחר לפחות ${MIN_TOPICS} נושאים (נבחרו ${ranked.length})`
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

    const handleSkip = () => {
      if (questionIndex + 1 < ranked.length) {
        setQuestionIndex(questionIndex + 1);
      } else {
        setStep("results");
      }
    };

    const handleBack = () => {
      if (questionIndex === 0) {
        setStep("rank");
      } else {
        setQuestionIndex(questionIndex - 1);
      }
    };

    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="flex justify-between items-center mb-8">
            <button onClick={handleBack} className="text-sm text-gray-400 hover:text-gray-600">← חזרה</button>
            <span className="text-sm text-gray-400">{questionIndex + 1} / {ranked.length}</span>
          </div>

          <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(questionIndex / ranked.length) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-white bg-emerald-600 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
              {questionIndex + 1}
            </span>
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">{topic.label}</p>
          </div>
          <h2 className="text-xl font-bold leading-snug mb-8">{q.question}</h2>

          <div className="flex flex-col gap-3 mb-6">
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

          <button
            onClick={handleSkip}
            className="w-full text-sm text-gray-400 hover:text-gray-600 text-center py-2"
          >
            דלג על שאלה זו
          </button>
        </div>
      </main>
    );
  }

  // ── Results phase ──────────────────────────────────────────────────────────
  const results = calcResults(ranked, answers);
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <button
          onClick={() => { setQuestionIndex(ranked.length - 1); setStep("questions"); }}
          className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block"
        >
          ← חזרה
        </button>
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
