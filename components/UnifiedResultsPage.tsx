"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Party } from "@/lib/parties";
import PartyResultCard from "@/components/PartyResultCard";
import ShareButton from "@/components/ShareButton";

type AiData = {
  profile: string;
  partyBlurbs: Record<string, string>;
};

type Props = {
  results: Array<Party & { score: number }>;
  userAnswersSummary?: string;
  accentColor: "blue" | "emerald" | "amber" | "purple" | "teal";
  onBack: () => void;
  // When provided, skips the internal /api/results call (used by prototype D)
  externalAiData?: AiData | null;
  externalAiLoading?: boolean;
};

const METHODOLOGY =
  "הציון מבוסס על הערכה ידנית של עמדות ציבוריות ידועות — לא על ניתוח אוטומטי של תוכניות מפלגה עדכניות. עמדות המפלגות החדשות (ביחד, ישר!) הן הערכה בלבד.";

export default function UnifiedResultsPage({
  results,
  userAnswersSummary,
  accentColor,
  onBack,
  externalAiData,
  externalAiLoading,
}: Props) {
  const router = useRouter();
  const [confirmHome, setConfirmHome] = useState(false);
  const [internalAiData, setInternalAiData] = useState<AiData | null>(null);
  const [internalAiLoading, setInternalAiLoading] = useState(true);

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
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.profile && data.partyBlurbs) setInternalAiData(data);
      })
      .catch(() => {})
      .finally(() => setInternalAiLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">
          ← חזרה
        </button>

        <h1 className="text-2xl font-bold mb-2">התוצאות שלך</h1>
        <p className="text-gray-500 text-sm mb-4">על סמך תשובותיך, כך דורגו המפלגות:</p>

        {/* Prototype caveat */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-xs text-amber-800 leading-relaxed">
          <strong>שימו לב — כלי ניסיוני:</strong> עמדות המפלגות מבוססות על הערכה ידנית חלקית, לא על ניתוח מלא של מצעים רשמיים. השתמשו בתוצאות כנקודת פתיחה בלבד.
        </div>

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

        {/* Party cards */}
        <div className="flex flex-col gap-3">
          {results.map((r, i) => (
            <PartyResultCard
              key={r.id}
              party={r}
              rank={i}
              accentColor={accentColor}
              aiBlurb={aiData?.partyBlurbs[r.id]}
              aiLoading={aiLoading && i < 3}
            />
          ))}
        </div>

        {/* Methodology disclaimer */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-6 text-xs text-gray-500 leading-relaxed">
          <strong>שיטת החישוב:</strong> {METHODOLOGY}
        </div>

        {/* Share */}
        <div className="mt-8 flex justify-center">
          <ShareButton variant="prominent" />
        </div>

        {/* Home navigation */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 mb-4">המידע מבוסס על עמדות ציבוריות ידועות · עלול להיות לא מדויק</p>
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
      </div>
    </main>
  );
}
