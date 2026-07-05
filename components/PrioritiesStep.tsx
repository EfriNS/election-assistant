"use client";

// Shared priorities-ranking step used by prototypes B, D, and E.

import { TOPICS, CRITICAL_WEIGHT, MAX_CRITICAL_TOPICS } from "@/lib/topics";

const BUCKETS = [
  { value: 4, label: "קריטי" },
  { value: 3, label: "חשוב מאוד" },
  { value: 2, label: "חשוב" },
  { value: 1, label: "פחות חשוב" },
] as const;

const MIN_IMPORTANT = 3;

type AccentColor = "emerald" | "teal" | "purple";

const ACCENT: Record<AccentColor, {
  bucket4: string; bucket3: string; bucket2: string; bucket1: string;
  cardActive: string; cardPending: string;
  button: string; buttonHover: string;
  counter: string;
}> = {
  emerald: {
    bucket4: "bg-emerald-600 text-white border-emerald-600",
    bucket3: "bg-emerald-400 text-white border-emerald-400",
    bucket2: "bg-emerald-200 text-emerald-800 border-emerald-300",
    bucket1: "bg-gray-200 text-gray-500 border-gray-300",
    cardActive: "border-emerald-300 bg-emerald-50/40",
    cardPending: "border-gray-200 bg-gray-50",
    button: "bg-emerald-600 text-white hover:bg-emerald-700",
    buttonHover: "hover:border-emerald-400",
    counter: "text-emerald-600",
  },
  teal: {
    bucket4: "bg-teal-600 text-white border-teal-600",
    bucket3: "bg-teal-400 text-white border-teal-400",
    bucket2: "bg-teal-200 text-teal-800 border-teal-300",
    bucket1: "bg-gray-200 text-gray-500 border-gray-300",
    cardActive: "border-teal-300 bg-teal-50/40",
    cardPending: "border-gray-200 bg-gray-50",
    button: "bg-teal-600 text-white hover:bg-teal-700",
    buttonHover: "hover:border-teal-400",
    counter: "text-teal-600",
  },
  purple: {
    bucket4: "bg-purple-600 text-white border-purple-600",
    bucket3: "bg-purple-400 text-white border-purple-400",
    bucket2: "bg-purple-200 text-purple-800 border-purple-300",
    bucket1: "bg-gray-200 text-gray-500 border-gray-300",
    cardActive: "border-purple-300 bg-purple-50/40",
    cardPending: "border-gray-200 bg-gray-50",
    button: "bg-purple-600 text-white hover:bg-purple-700",
    buttonHover: "hover:border-purple-400",
    counter: "text-purple-600",
  },
};

type Props = {
  buckets: Record<string, number>;
  setBuckets: (b: Record<string, number>) => void;
  onContinue: () => void;
  accentColor?: AccentColor;
  onBack?: () => void;
};

export default function PrioritiesStep({
  buckets,
  setBuckets,
  onContinue,
  accentColor = "emerald",
  onBack,
}: Props) {
  const c = ACCENT[accentColor];

  const criticalCount = Object.values(buckets).filter((w) => w === CRITICAL_WEIGHT).length;

  const setBucket = (topicId: string, value: number) => {
    const isTurningCritical = value === CRITICAL_WEIGHT && buckets[topicId] !== CRITICAL_WEIGHT;
    if (isTurningCritical && criticalCount >= MAX_CRITICAL_TOPICS) return;
    setBuckets({ ...buckets, [topicId]: buckets[topicId] === value ? 0 : value });
  };

  const importantCount = Object.values(buckets).filter((w) => w >= 2).length;
  const canProceed = importantCount >= MIN_IMPORTANT;

  const bucketActiveClass: Record<number, string> = {
    4: c.bucket4, 3: c.bucket3, 2: c.bucket2, 1: c.bucket1,
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        {onBack && (
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onBack(); }}
            className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block"
          >
            ← חזרה
          </a>
        )}
        <h1 className="text-2xl font-bold mb-2">כמה כל נושא חשוב לך?</h1>
        <p className="text-gray-500 text-sm mb-1 leading-relaxed">
          לכל נושא — בחר את רמת החשיבות שלו עבורך.
          ככל שתסמן יותר נושאים כחשובים, כך התוצאה תהיה מדויקת יותר.
        </p>
        <p className="text-sm text-gray-600 mb-2">
          יש לסמן <strong>לפחות {MIN_IMPORTANT} נושאים{" "}</strong>כ&quot;חשוב&quot; או יותר כדי להמשיך.
        </p>
        <p className="text-sm text-gray-600 mb-8">
          ניתן לסמן כ&quot;קריטי&quot; עד {MAX_CRITICAL_TOPICS} נושאים — כדי לשמור על המשמעות שלו:
          מפלגה שמתנגדת לתשובה שלך בנושא קריטי לא תוכל להיות ההתאמה המובילה שלך,
          לא משנה כמה טובה ההתאמה בשאר הנושאים.
        </p>

        <div className="flex flex-col gap-3 mb-8">
          {TOPICS.map((t) => {
            const selected = buckets[t.id] ?? 0;
            return (
              <div
                key={t.id}
                className={`border-2 rounded-xl p-4 transition-all ${
                  selected >= 2
                    ? c.cardActive
                    : selected === 1
                    ? c.cardPending
                    : "border-gray-200"
                }`}
              >
                <p className="text-sm font-medium mb-3 text-right">{t.label}</p>
                <div className="flex gap-2 flex-row-reverse">
                  {BUCKETS.map((b) => {
                    const criticalCapped =
                      b.value === CRITICAL_WEIGHT &&
                      selected !== CRITICAL_WEIGHT &&
                      criticalCount >= MAX_CRITICAL_TOPICS;
                    return (
                      <button
                        key={b.value}
                        onClick={() => setBucket(t.id, b.value)}
                        disabled={criticalCapped}
                        title={criticalCapped ? `ניתן לסמן עד ${MAX_CRITICAL_TOPICS} נושאים כ"קריטי"` : undefined}
                        className={`flex-1 text-xs py-1.5 px-1 rounded-lg border-2 font-medium transition-all focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none ${
                          criticalCapped
                            ? "border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed opacity-60"
                            : selected === b.value
                            ? bucketActiveClass[b.value]
                            : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 bg-white"
                        }`}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-4 text-center text-sm text-gray-500">
          {importantCount < MIN_IMPORTANT ? (
            <span>סומנו {importantCount} נושאים כ&quot;חשוב&quot; או יותר — יש לסמן לפחות {MIN_IMPORTANT}</span>
          ) : (
            <span className={c.counter}>
              {importantCount} נושאים סומנו כחשובים
              {importantCount < TOPICS.length && " — ניתן לסמן עוד"}
            </span>
          )}
          <div className="text-xs text-gray-400 mt-1">
            {criticalCount}/{MAX_CRITICAL_TOPICS} סומנו כקריטי
          </div>
        </div>

        <button
          onClick={onContinue}
          disabled={!canProceed}
          className={`w-full py-4 rounded-xl font-semibold transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none ${c.button}`}
        >
          המשך
        </button>
      </div>
    </main>
  );
}

export { TOPICS, MIN_IMPORTANT };
export type { AccentColor };
