"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Party } from "@/lib/parties";
import { PartyGroundingResult } from "@/lib/grounding-types";
import PartyResultCard from "@/components/PartyResultCard";
import ShareButton from "@/components/ShareButton";
import { mpTrack } from "@/lib/mixpanel";

// ─── Types ───────────────────────────────────────────────────────────────────

type AiData = {
  profile: string;
  partyBlurbs: Record<string, string>;
};

type Props = {
  results: Array<Party & { score: number }>;
  userAnswersSummary?: string;
  answeredTopicIds?: string[];
  topicAnswerTexts?: Record<string, string>;
  topicCoveredAspects?: Record<string, string[]>;
  topicScores?: Record<string, Record<string, number>>; // partyId → topicId → 0–100
  accentColor: "blue" | "emerald" | "amber" | "purple" | "teal";
  sessionId?: string;
  onBack: () => void;
  // When provided, skips the internal /api/results call (used by prototype D)
  externalAiData?: AiData | null;
  externalAiLoading?: boolean;
};

export default function UnifiedResultsPage({
  results,
  userAnswersSummary,
  answeredTopicIds,
  topicAnswerTexts,
  topicCoveredAspects,
  topicScores,
  accentColor,
  sessionId,
  onBack,
  externalAiData,
  externalAiLoading,
}: Props) {
  const router = useRouter();
  const [confirmHome, setConfirmHome] = useState(false);
  const [internalAiData, setInternalAiData] = useState<AiData | null>(null);
  const [internalAiLoading, setInternalAiLoading] = useState(true);
  const [groundings, setGroundings] = useState<Record<string, PartyGroundingResult> | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  // If either external prop is passed, D is managing AI data — skip internal fetch
  const isExternal = externalAiData !== undefined || externalAiLoading !== undefined;
  const aiData = isExternal ? externalAiData : internalAiData;
  const aiLoading = isExternal ? (externalAiLoading ?? false) : internalAiLoading;

  useEffect(() => {
    if (isExternal) return;
    fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answersSummary: userAnswersSummary ?? "",
        topParties: results.map((r) => ({ id: r.id, name: r.name, score: r.score })),
        answeredTopicIds: answeredTopicIds ?? [],
        topicCoveredAspects: topicCoveredAspects ?? {},
        sessionId,
      }),
    })
      .then((res) => {
        if (res.status === 429) {
          setQuotaExceeded(true);
          mpTrack("api_error", { session_id: sessionId, endpoint: "/api/results", error_code: "QUOTA_EXCEEDED" });
        }
        return res.json();
      })
      .then((data) => {
        if (data.profile && data.partyBlurbs) setInternalAiData(data);
        if (data.groundings) setGroundings(data.groundings);
      })
      .catch(() => {
        mpTrack("api_error", { session_id: sessionId, endpoint: "/api/results", error_code: "SERVER_ERROR" });
      })
      .finally(() => setInternalAiLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire results_viewed once on mount — captures score distribution for Q6.
  useEffect(() => {
    if (results.length === 0) return;
    mpTrack("results_viewed", {
      session_id: sessionId,
      top_party: results[0].id,
      top_score: results[0].score,
      ...(results[1] ? { second_party: results[1].id, second_score: results[1].score } : {}),
      ...(results[2] ? { third_party: results[2].id, third_score: results[2].score, score_spread_top3: results[0].score - results[2].score } : {}),
      ...Object.fromEntries(results.map((r) => [`score_${r.id}`, r.score])),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSavePdf = async () => {
    setPdfLoading(true);
    setPdfError(false);
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results,
          aiProfile: aiData?.profile,
          partyBlurbs: aiData?.partyBlurbs,
          groundings,
          topicScores,
          answeredTopicIds,
          topicAnswerTexts,
          accentColor,
          quotaExceeded,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "תוצאות-עוזר-הבחירות.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[export-pdf]", e);
      setPdfError(true);
      setTimeout(() => setPdfError(false), 4000);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">
          ← חזרה
        </button>

        <h1 className="text-2xl font-bold mb-2">התוצאות שלך</h1>
        <p className="text-gray-500 text-sm mb-6">על סמך תשובותיך, כך דורגו המפלגות:</p>

        {/* Quota degradation notice */}
        {quotaExceeded && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5 text-xs text-gray-500 leading-relaxed">
            בשל עומס גבוה, ניתוח ה-AI אינו זמין כרגע. ציוני ההתאמה מבוססים על המצעים ומוצגים במלואם.
          </div>
        )}

        {/* AI profile summary */}
        {(aiLoading || aiData?.profile) && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-6 flex items-start gap-2 min-h-[56px]">
            <span className="text-indigo-300 mt-0.5 shrink-0 text-xs">✦</span>
            {aiLoading ? (
              <p className="text-xs text-indigo-300 animate-pulse">מנתח את עמדותיך...</p>
            ) : (
              <p className="text-sm text-indigo-900 leading-relaxed">{aiData!.profile}</p>
            )}
          </div>
        )}

        {/* Close-score notice */}
        {(() => {
          const top1 = results[0]?.score ?? 0;
          const isClose = results.length >= 3 && top1 - results[2].score <= 12;
          if (!isClose) return null;
          return (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 text-xs text-gray-500 leading-relaxed" dir="rtl">
              <span className="font-medium text-gray-600">שלוש המפלגות המובילות קרובות בציון</span>
              {" "}({results[2].score}%–{top1}%).
              {" "}הפרש קטן אינו מכריע — הסתכלו על הנושאים (✓ / ~ / ✕) בכל כרטיסייה כדי לראות היכן המפלגות נבדלות.
            </div>
          );
        })()}

        {/* Party cards */}
        {(() => {
          const top1 = results[0]?.score ?? 0;
          // Last index of the "close group" — within 15 pts of #1, at least the top 3
          const lastCloseIdx = results.reduce(
            (last, r, i) => (i < 3 || r.score >= top1 - 15 ? i : last),
            0
          );
          const showSeparator = lastCloseIdx < results.length - 1;

          return (
            <div className="flex flex-col gap-3">
              {results.map((r, i) => (
                <div key={r.id}>
                  <PartyResultCard
                    party={r}
                    rank={i}
                    accentColor={accentColor}
                    aiBlurb={aiData?.partyBlurbs[r.id]}
                    aiLoading={aiLoading && i < 3}
                    groundingData={groundings?.[r.id]}
                    topicAnswerTexts={topicAnswerTexts}
                    partyTopicScores={topicScores?.[r.id]}
                    answeredTopicIds={answeredTopicIds}
                    showTopicBreakdown={topicScores != null}
                  />
                  {showSeparator && i === lastCloseIdx && (
                    <div className="flex items-center gap-3 mt-3 mb-1" dir="rtl">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-300 whitespace-nowrap">שאר המפלגות</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Methodology */}
        <details className="bg-gray-50 border border-gray-200 rounded-xl mt-6 text-xs text-gray-500 leading-relaxed group">
          <summary className="px-4 py-3 cursor-pointer select-none list-none flex items-center justify-between text-gray-500 hover:text-gray-700">
            <span>
              <strong className="text-gray-600">שיטת החישוב:</strong>{" "}
              ציוני ההתאמה מבוססים על ציטוטים ממצעי המפלגות — המקורות מקושרים בכרטיסיות למטה.
            </span>
            <span className="mr-3 shrink-0 text-gray-400 group-open:rotate-90 transition-transform duration-150">◀</span>
          </summary>
          <div className="px-4 pb-4 pt-3 border-t border-gray-200 space-y-3">
            <div>
              <strong className="text-gray-600">ציון לנושא: 2− עד 2+</strong>
              <p className="mt-1">
                לכל תשובה לשאלת הפתיחה יש ציון מוגדר מראש לכל מפלגה: 2+ (התאמה מלאה),
                1+ (התאמה חלקית), 0 (ניטרלי), 1− (חוסר התאמה חלקי), 2− (עמדה מנוגדת).
                הציונים נגזרים מציטוטים ישירים מהמצעים הרשמיים.
              </p>
            </div>
            <div>
              <strong className="text-gray-600">שאלות המשך שמייצר ה-AI</strong>
              <p className="mt-1">
                לאחר כל תשובה, ה-AI מייצר שאלות המשך ממוקדות בהתבסס על תשובתך — במטרה להבחין
                בין מפלגות ״שכנות״ אידיאולוגית שציון הפתיחה לא מפריד ביניהן.
                תשובות אלה מנותחות על ידי ה-AI מול ציטוטים מהמצעים, ומשקלן שווה לשאלת הפתיחה (50/50).
              </p>
            </div>
            <div>
              <strong className="text-gray-600">משקל העדיפויות</strong>
              <p className="mt-1">
                נושא שסימנת כ״קריטי״ תורם פי-4 לציון הסופי לעומת ״פחות חשוב״ (יחס 4:3:2:1).
                כך נושאים שחשובים לך באמת שולטים בתוצאה.
              </p>
            </div>
            <div>
              <strong className="text-gray-600">ציון סופי</strong>
              <p className="mt-1">
                ממוצע משוקלל של כל הנושאים שענית עליהם, מנורמל ל-0–100%.
                הציון אינו ליניארי — אי-התאמה בנושא אחד גורמת לירידה גדולה יותר
                ממה שהסכמה על נושא אחר תפצה עליה. כך מפלגה שמסכימה על הכל חוץ
                מנושא אחד לא תקבל ציון מלא.
              </p>
            </div>
          </div>
        </details>

        {/* Share */}
        <div className="mt-8 flex justify-center">
          <ShareButton variant="prominent" />
        </div>

        {/* Save results as PDF — shown only after AI + groundings finish loading */}
        {!aiLoading && (
          <div className="mt-3 flex flex-col items-center gap-1">
            <button
              onClick={handleSavePdf}
              disabled={pdfLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600 hover:text-gray-800 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>מכין את הקובץ...</span>
                </>
              ) : (
                <>
                  <span>📄</span>
                  <span>שמור תוצאות כ-PDF</span>
                </>
              )}
            </button>
            {pdfError && (
              <p className="text-xs text-red-400">שגיאה ביצירת הקובץ — אנא נסו שוב</p>
            )}
          </div>
        )}


        {/* Home navigation */}
        <div className="mt-6 text-center">
          {!confirmHome ? (
            <button onClick={() => setConfirmHome(true)} className="text-sm text-gray-400 hover:text-gray-600">
              ← חזרה לדף הבית
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-500">התשובות והתוצאות יאבדו —</span>
              <button onClick={() => router.push("/")} className="text-red-500 hover:text-red-700 font-medium">
                בטוח
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={() => setConfirmHome(false)} className="text-gray-400 hover:text-gray-600">
                ביטול
              </button>
            </div>
          )}
        </div>

        <div className="mt-2 text-center">
          <a href="/terms" className="text-xs text-gray-400 hover:text-gray-600">
            תנאי שימוש ופרטיות
          </a>
        </div>
      </div>
    </main>
  );
}
