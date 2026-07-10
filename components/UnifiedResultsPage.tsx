"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Party } from "@/lib/parties";
import { PartyGroundingResult } from "@/lib/grounding-types";
import PartyResultCard from "@/components/PartyResultCard";
import ShareButton from "@/components/ShareButton";
import { mpTrack } from "@/lib/mixpanel";
import { GATE_SCORE_CAP } from "@/lib/scoring";
import { MAX_CRITICAL_TOPICS } from "@/lib/topics";
import { DocumentIcon, SpinnerIcon, ChevronIcon } from "@/components/icons";

// ─── Types ───────────────────────────────────────────────────────────────────

type AiData = {
  profile: string;
  partyBlurbs: Record<string, string>;
};

type Props = {
  results: Array<Party & { score: number; rawScore?: number; criticalConflicts?: string[] }>;
  userAnswersSummary?: string;
  answeredTopicIds?: string[];
  topicAnswerTexts?: Record<string, string>;
  topicCoveredAspects?: Record<string, string[]>;
  topicScores?: Record<string, Record<string, number>>; // partyId → topicId → 0–100
  sessionId?: string;
  // Quiz-session context for analytics enrichment (only the quiz flow passes it)
  quizContext?: { topicsSelected: number; aiScoringUsed: boolean; quizCompletedAtMs: number | null };
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
  sessionId,
  quizContext,
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

  const trackInteraction = (action: string, extra?: Record<string, unknown>) =>
    mpTrack("results_interaction", { session_id: sessionId, action, ...extra });

  useEffect(() => {
    if (isExternal) return;
    const fetchStart = Date.now();
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
        // How long users stared at the "analyzing" state, and whether the AI
        // layer actually arrived — Q6 results can't be interpreted without this.
        mpTrack("results_ai_loaded", {
          session_id: sessionId,
          blurb_shown: !!(data.profile && data.partyBlurbs),
          groundings_shown: !!data.groundings,
          seconds_to_load: Math.round((Date.now() - fetchStart) / 1000),
        });
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
      // spread_top2 measures recommendation decisiveness (#1 vs #2);
      // spread_top3 measures how muddy the whole top group is.
      ...(results[1] ? { second_party: results[1].id, second_score: results[1].score, score_spread_top2: results[0].score - results[1].score } : {}),
      ...(results[2] ? { third_party: results[2].id, third_score: results[2].score, score_spread_top3: results[0].score - results[2].score } : {}),
      top3_parties: results.slice(0, 3).map((r) => r.id),
      ...Object.fromEntries(results.map((r) => [`score_${r.id}`, r.score])),
      ...(quizContext
        ? {
            topics_selected: quizContext.topicsSelected,
            ai_scoring_used: quizContext.aiScoringUsed,
            ...(quizContext.quizCompletedAtMs
              ? { seconds_to_results: Math.round((Date.now() - quizContext.quizCompletedAtMs) / 1000) }
              : {}),
          }
        : {}),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSavePdf = async () => {
    trackInteraction("pdf_export");
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
          accentColor: "teal",
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
      mpTrack("api_error", { session_id: sessionId, endpoint: "/api/export-pdf", error_code: "SERVER_ERROR" });
      setPdfError(true);
      setTimeout(() => setPdfError(false), 4000);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <button onClick={() => { trackInteraction("back_to_quiz"); onBack(); }} className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">
          → חזרה
        </button>

        <h1 className="text-2xl font-bold mb-2">התוצאות שלך</h1>
        <p className="text-gray-500 text-sm mb-1">על סמך תשובותיך, כך דורגו המפלגות:</p>
        <p className="text-gray-400 text-xs mb-6">האחוזים הם ניתוח של הכלי (בסיוע בינה מלאכותית) להתאמה בין תשובותיך לעמדות כל מפלגה — לא הצהרה של המפלגה על עצמה.</p>

        {/* Quota degradation notice */}
        {quotaExceeded && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5 text-xs text-gray-500 leading-relaxed">
            בשל עומס גבוה, ניתוח ה-AI אינו זמין כרגע. ציוני ההתאמה מבוססים על המצעים ומוצגים במלואם.
          </div>
        )}

        {/* AI profile summary — neutral container like every other notice on this
            page; the teal ✦ marker alone signals "this is the AI's interpretation." */}
        {(aiLoading || aiData?.profile) && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-2 min-h-[56px]">
            <span className="text-teal-500 mt-0.5 shrink-0 text-xs">✦</span>
            {aiLoading ? (
              <p className="text-xs text-gray-400 animate-pulse">מנתח את עמדותיך...</p>
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">{aiData!.profile}</p>
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
        <details
          onToggle={(e) => { if (e.currentTarget.open) trackInteraction("methodology_opened"); }}
          className="bg-gray-50 border border-gray-200 rounded-xl mt-6 text-xs text-gray-500 leading-relaxed group">
          <summary className="px-4 py-3 cursor-pointer select-none list-none flex items-center justify-between text-gray-500 hover:text-gray-700">
            <span>
              <strong className="text-gray-600">שיטת החישוב:</strong>{" "}
              ציוני ההתאמה מבוססים על ציטוטים ממצעי המפלגות — המקורות מקושרים בכרטיסיות למטה.
            </span>
            <ChevronIcon className="mr-3 shrink-0 w-3.5 h-3.5 text-gray-400 rotate-90 group-open:-rotate-90 transition-transform duration-150" />
          </summary>
          <div className="px-4 pb-4 pt-3 border-t border-gray-200 space-y-3">
            <div>
              <strong className="text-gray-600">מה ההתאמה לא מודדת</strong>
              <p className="mt-1">
                ההתאמה נבדקת מול מה שמפלגה כותבת ומצהירה באופן רשמי — במצע, בחוקה
                או בהצהרות. היא אינה מודדת את האופן שבו המפלגה פעלה בעבר בשלטון
                או בקואליציה, ולא את מהימנות חבריה. מסמך רשמי, גם כשהוא עדכני,
                אינו ערובה להתנהלות בפועל — אלה שיקולים חשובים שכדאי לבחון בנפרד.
              </p>
            </div>
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
                כך נושאים שחשובים לך באמת שולטים בתוצאה. ניתן לסמן עד {MAX_CRITICAL_TOPICS}{" "}
                נושאים כ״קריטי״ — כדי לשמור על המשמעות שלו.
              </p>
            </div>
            <div>
              <strong className="text-gray-600">התנגשות עם עדיפות קריטית</strong>
              <p className="mt-1">
                אם מפלגה מתנגדת לעמדתך בנושא שסימנת כ״קריטי״, ציון ההתאמה הכולל שלה
                מוגבל לכל היותר ל-{GATE_SCORE_CAP}%, גם אם היא מסכימה איתך ברוב שאר
                הנושאים. כרטיסיית המפלגה מציינת מפורשות כשזה קורה.
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
                  <SpinnerIcon className="w-4 h-4" />
                  <span>מכין את הקובץ...</span>
                </>
              ) : (
                <>
                  <DocumentIcon className="w-4 h-4" />
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
            <button onClick={() => { trackInteraction("go_home_clicked"); setConfirmHome(true); }} className="text-sm text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none rounded">
              → חזרה לדף הבית
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-500">התשובות והתוצאות יאבדו —</span>
              <button onClick={() => { trackInteraction("go_home_confirmed"); router.push("/"); }} className="text-red-500 hover:text-red-700 font-medium focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:outline-none rounded">
                בטוח
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={() => setConfirmHome(false)} className="text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none rounded">
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
