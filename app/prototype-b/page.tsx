"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PARTIES } from "@/lib/parties";
import PartyResultCard from "@/components/PartyResultCard";

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

// ─── Importance buckets ────────────────────────────────────────────────────────

const BUCKETS = [
  { value: 4, label: "קריטי",      activeClass: "bg-emerald-600 text-white border-emerald-600" },
  { value: 3, label: "חשוב מאוד",  activeClass: "bg-emerald-400 text-white border-emerald-400" },
  { value: 2, label: "חשוב",       activeClass: "bg-emerald-200 text-emerald-800 border-emerald-300" },
  { value: 1, label: "פחות חשוב",  activeClass: "bg-gray-200 text-gray-500 border-gray-300" },
] as const;

const MIN_IMPORTANT = 3; // minimum topics at bucket ≥ 2

// ─── Within-topic questions ────────────────────────────────────────────────────
// Scores indexed by party order from lib/parties.ts:
//   [hadash, democrats, beyahad, yashar, beitenu, likud, shas]
// NOTE: rough estimates — not verified against current party platforms.

type Option = { id: string; text: string; scores: number[] };
type TopicQ = { question: string; options: Option[] };

const PRIORITY_QUESTIONS: Record<string, TopicQ> = {
  security: {
    question: "בתחום הביטחון — מה הכי מדאיג אותך?",
    options: [
      { id: "attacks",  text: "הגנה מיידית — עצירת הרקטות, המנהרות, והמתקפות",           scores: [-2,  0,  0,  1,  1,  2,  1] },
      { id: "peace",    text: "הסדר קבוע — שלא נחיה בלופ של מלחמות ללא סוף",              scores: [ 2,  2,  1,  0, -1, -2, -1] },
      { id: "autonomy", text: "עצמאות — שלא נהיה תלויים לצמיתות בנשק ותמיכה מחו\"ל",     scores: [ 1,  0,  1,  1,  2,  1,  0] },
      { id: "image",    text: "מעמד ישראל — שלא ניקלע לבדידות דיפלומטית בינלאומית",       scores: [ 1,  1,  2,  1,  0, -1,  0] },
    ],
  },
  economy: {
    question: "בכלכלה — מה הכי מכביד עליך?",
    options: [
      { id: "costliving", text: "יוקר המחיה — המשכורת לא מגיעה לסוף החודש",               scores: [ 2,  2,  2,  1,  1,  0,  2] },
      { id: "future",     text: "עתיד הדור הצעיר — קשה להסתדר בלי עזרה מההורים",          scores: [ 1,  2,  2,  1,  1,  0,  1] },
      { id: "inequality", text: "פערים — בעלי הון מתעשרים, השכירים נשארים מאחור",          scores: [ 2,  2,  1,  0,  0, -1,  2] },
      { id: "growth",     text: "עצירת הצמיחה — ישראל מפגרת כלכלית מהיכולת שלה",         scores: [-1,  0,  1,  2,  2,  2,  0] },
    ],
  },
  housing: {
    question: "בדיור — מה הכי לוחץ אצלך?",
    options: [
      { id: "rent",     text: "שכירות — שכר הדירה גבוה ואי אפשר לחסוך",                   scores: [ 2,  2,  1,  1,  0,  0,  2] },
      { id: "buy",      text: "רכישה — דירה היא חלום שהדור הצעיר לא יכול להרשות",         scores: [ 0,  1,  2,  1,  1,  1,  1] },
      { id: "location", text: "מיקום — רוצה לגור קרוב לעבודה, לא בפריפריה",               scores: [ 0,  0,  1,  2,  1,  1,  0] },
      { id: "homeless", text: "חסרי דיור — שיש אנשים ישנים ברחוב זה בלתי נסלח",           scores: [ 2,  2,  1,  0,  0, -1,  2] },
    ],
  },
  education: {
    question: "בחינוך — מה הכי חשוב לך?",
    options: [
      { id: "quality", text: "איכות — מורים מעולים שמשתכרים בהתאם",                       scores: [ 1,  2,  2,  1,  1,  1,  0] },
      { id: "equal",   text: "שוויון — כל ילד מקבל אותה הזדמנות, ללא קשר לרקע",           scores: [ 2,  2,  1,  1,  1,  0, -1] },
      { id: "values",  text: "ערכים — בית ספר שמעביר זהות, מורשת, ולאום",                 scores: [-1,  0,  0,  1,  0,  2,  2] },
      { id: "skills",  text: "כישורים — הכנה אמיתית לשוק העבודה של המאה ה-21",            scores: [ 1,  1,  2,  2,  2,  1,  0] },
    ],
  },
  health: {
    question: "בבריאות — מה הכי מדאיג אותך?",
    options: [
      { id: "wait",    text: "תורים — חודשים להמתין לרופא מומחה זה מסכן חיים",             scores: [ 1,  1,  2,  2,  1,  1,  1] },
      { id: "cost",    text: "עלות — טיפולים שלא בסל עולים הון שאין לכולם",               scores: [ 2,  2,  1,  1,  0,  0,  2] },
      { id: "doctors", text: "בריחת רופאים — הרפואה הטובה עוזבת לחו\"ל",                  scores: [ 1,  1,  2,  2,  2,  1,  0] },
      { id: "gaps",    text: "פערים — ביישובים מסוימים הרפואה הרבה יותר גרועה",            scores: [ 2,  2,  1,  1,  0,  0,  2] },
    ],
  },
  religion: {
    question: "בדת ומדינה — מה הכי מפריע לך?",
    options: [
      { id: "coercion",  text: "כפייה — אני רוצה לחיות לפי ערכיי, לא לפי הרבנות",         scores: [ 2,  2,  2,  1,  2,  0, -2] },
      { id: "identity",  text: "זהות — מדינת ישראל מאבדת את אופייה היהודי",                scores: [-2, -1, -1,  1,  1,  1,  2] },
      { id: "pluralism", text: "הכרה — הזרם הדתי שלי (רפורמי/קונסרבטיבי) לא מוכר",        scores: [ 1,  2,  2,  1,  2,  0, -2] },
      { id: "marriage",  text: "נישואין — אי אפשר להינשא אזרחית בישראל",                   scores: [ 2,  2,  2,  1,  2, -1, -2] },
    ],
  },
  justice: {
    question: "במערכת המשפט — מה הכי חשוב לך?",
    options: [
      { id: "independence", text: "עצמאות — שופטים שלא תלויים בפוליטיקאים שמינו אותם",    scores: [ 2,  2,  2,  1,  1, -2, -1] },
      { id: "oversight",    text: "ביקורת — גם בית המשפט צריך מישהו שיאזן אותו",           scores: [-1, -1, -1,  0,  0,  2,  2] },
      { id: "consensus",    text: "יציבות — שינויים משפטיים רק בהסכמה רחבה",               scores: [ 1,  1,  1,  2,  1,  0,  0] },
      { id: "diversity",    text: "ייצוג — בית המשפט צריך לשקף את כל הציבור הישראלי",     scores: [ 2,  1,  1,  1,  0,  1,  2] },
    ],
  },
  equality: {
    question: "בזכויות אדם ושוויון — מה הכי חשוב לך?",
    options: [
      { id: "law",       text: "חוק ברור — הגנה משפטית מפורשת מפני אפליה",                 scores: [ 2,  2,  2,  1,  1,  0, -1] },
      { id: "represent", text: "ייצוג — מיעוטים חייבים להיות חלק ממוסדות המדינה",          scores: [ 2,  2,  1,  1,  0,  0,  0] },
      { id: "character", text: "אופי יהודי — שמירת הרוב היהודי והאופי הלאומי",             scores: [-2, -1,  0,  1,  1,  2,  2] },
      { id: "lgbtq",     text: "LGBTQ+ — כולם ראויים לחיות בכבוד וללא אפליה",              scores: [ 2,  2,  2,  1,  1, -1, -2] },
    ],
  },
};

// ─── Party matching ────────────────────────────────────────────────────────────

function calcResults(buckets: Record<string, number>, answers: Record<string, string>) {
  const totals = new Array(PARTIES.length).fill(0);
  const maxPossible = new Array(PARTIES.length).fill(0);

  Object.entries(buckets).forEach(([topicId, weight]) => {
    if (weight === 0) return;
    const chosenId = answers[topicId];
    const option = PRIORITY_QUESTIONS[topicId]?.options.find((o) => o.id === chosenId);
    if (!option) return;
    option.scores.forEach((score, pi) => {
      totals[pi] += weight * (score + 2); // normalize -2..+2 → 0..4
      maxPossible[pi] += weight * 4;
    });
  });

  return PARTIES.map((party, i) => ({
    ...party,
    score: maxPossible[i] > 0 ? Math.round((totals[i] / maxPossible[i]) * 100) : 50,
  })).sort((a, b) => b.score - a.score);
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = "rank" | "questions" | "results";

export default function PrototypeB() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("rank");
  const [confirmHome, setConfirmHome] = useState(false);
  const [buckets, setBuckets] = useState<Record<string, number>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const setBucket = (topicId: string, value: number) => {
    setBuckets((prev) => ({ ...prev, [topicId]: prev[topicId] === value ? 0 : value }));
  };

  // Topics with importance ≥ 2, sorted highest bucket first, then lower buckets
  const topicsToAsk = Object.entries(buckets)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const importantCount = Object.values(buckets).filter((w) => w >= 2).length;
  const canProceed = importantCount >= MIN_IMPORTANT;

  // ── Bucket assignment phase ────────────────────────────────────────────────
  if (step === "rank") {
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← חזרה</a>
          <h1 className="text-2xl font-bold mb-2">כמה כל נושא חשוב לך?</h1>
          <p className="text-gray-500 text-sm mb-1 leading-relaxed">
            לכל נושא — בחר את רמת החשיבות שלו עבורך.
            ככל שתסמן יותר נושאים כחשובים, כך התוצאה תהיה מדויקת יותר.
          </p>
          <p className="text-xs text-gray-400 mb-8">
            יש לסמן לפחות {MIN_IMPORTANT} נושאים כ"חשוב" או יותר כדי להמשיך.
          </p>

          <div className="flex flex-col gap-3 mb-8">
            {TOPICS.map((t) => {
              const selected = buckets[t.id] ?? 0;
              return (
                <div
                  key={t.id}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    selected >= 2
                      ? "border-emerald-300 bg-emerald-50/40"
                      : selected === 1
                      ? "border-gray-200 bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <p className="text-sm font-medium mb-3 text-right">{t.label}</p>
                  <div className="flex gap-2 flex-row-reverse">
                    {BUCKETS.map((b) => (
                      <button
                        key={b.value}
                        onClick={() => setBucket(t.id, b.value)}
                        className={`flex-1 text-xs py-1.5 px-1 rounded-lg border-2 font-medium transition-all ${
                          selected === b.value
                            ? b.activeClass
                            : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 bg-white"
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-4 text-center text-sm text-gray-500">
            {importantCount < MIN_IMPORTANT ? (
              <span>סומנו {importantCount} נושאים כ"חשוב" או יותר — יש לסמן לפחות {MIN_IMPORTANT}</span>
            ) : (
              <span className="text-emerald-600">
                {importantCount} נושאים סומנו כחשובים
                {importantCount < TOPICS.length && " — ניתן לסמן עוד"}
              </span>
            )}
          </div>

          <button
            onClick={() => { setQuestionIndex(0); setStep("questions"); }}
            disabled={!canProceed}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40"
          >
            המשך
          </button>
        </div>
      </main>
    );
  }

  // ── Question phase ─────────────────────────────────────────────────────────
  if (step === "questions") {
    const topicId = topicsToAsk[questionIndex];
    const topic = TOPICS.find((t) => t.id === topicId)!;
    const q = PRIORITY_QUESTIONS[topicId];
    const bucketLabel = BUCKETS.find((b) => b.value === (buckets[topicId] ?? 0))?.label;

    const handleAnswer = (optionId: string) => {
      const next = { ...answers, [topicId]: optionId };
      setAnswers(next);
      if (questionIndex + 1 < topicsToAsk.length) {
        setQuestionIndex(questionIndex + 1);
      } else {
        setStep("results");
      }
    };

    const handleSkip = () => {
      if (questionIndex + 1 < topicsToAsk.length) {
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
            <span className="text-sm text-gray-400" dir="ltr">{questionIndex + 1} / {topicsToAsk.length}</span>
          </div>

          <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(questionIndex / topicsToAsk.length) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-2 mb-1">
            {bucketLabel && (
              <span className="text-xs text-white bg-emerald-600 rounded-full px-2 py-0.5 shrink-0">
                {bucketLabel}
              </span>
            )}
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

          <button onClick={handleSkip} className="w-full text-sm text-gray-400 hover:text-gray-600 text-center py-2">
            דלג על שאלה זו
          </button>
        </div>
      </main>
    );
  }

  // ── Results phase ──────────────────────────────────────────────────────────
  const results = calcResults(buckets, answers);

  const bucketGroups = BUCKETS.map((b) => ({
    ...b,
    topics: TOPICS.filter((t) => (buckets[t.id] ?? 0) === b.value).map((t) => t.label),
  })).filter((g) => g.topics.length > 0);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <button
          onClick={() => { setQuestionIndex(topicsToAsk.length - 1); setStep("questions"); }}
          className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block"
        >
          ← חזרה
        </button>
        <h1 className="text-2xl font-bold mb-2">התוצאות שלך</h1>
        <p className="text-gray-500 text-sm mb-3">משוקלל לפי מה שסימנת כחשוב:</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {bucketGroups.map((g) => (
            <div key={g.value} className="text-xs text-gray-500">
              <span className={`inline-block px-2 py-0.5 rounded-full font-medium mr-1 ${
                g.value >= 3 ? "bg-emerald-100 text-emerald-700" :
                g.value === 2 ? "bg-emerald-50 text-emerald-600" :
                "bg-gray-100 text-gray-400"
              }`}>{g.label}</span>
              {g.topics.join("، ")}
            </div>
          ))}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-xs text-gray-500 leading-relaxed">
          <strong>שיטת החישוב:</strong> הציון מבוסס על הערכה ידנית של עמדות ציבוריות ידועות — לא על ניתוח אוטומטי של תוכניות מפלגה עדכניות. עמדות המפלגות החדשות (ביחד, ישר!) הן הערכה בלבד.
        </div>

        <div className="flex flex-col gap-3">
          {results.map((r, i) => (
            <PartyResultCard key={r.id} party={r} rank={i} accentColor="emerald" />
          ))}
        </div>
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 mb-4">המידע מבוסס על עמדות ציבוריות ידועות · עשוי להיות לא מדויק</p>
          {!confirmHome ? (
            <button onClick={() => setConfirmHome(true)} className="text-sm text-gray-400 hover:text-gray-600">
              ← חזרה לדף הבית
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-500">התשובות והתוצאות יאבדו —</span>
              <button onClick={() => router.push("/")} className="text-red-500 hover:text-red-700 font-medium">בטוח</button>
              <span className="text-gray-300">|</span>
              <button onClick={() => setConfirmHome(false)} className="text-gray-400 hover:text-gray-600">ביטול</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
