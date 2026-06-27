"use client";

import { useState } from "react";
import { Party } from "@/lib/parties";
import { PartyGroundingResult } from "@/lib/grounding-types";
import { TOPIC_LABELS } from "@/lib/topics";

type Props = {
  party: Party & { score: number };
  rank: number;
  accentColor: "blue" | "emerald" | "amber" | "purple" | "teal";
  aiBlurb?: string;
  aiLoading?: boolean;
  groundingData?: PartyGroundingResult;
  topicAnswerTexts?: Record<string, string>;
  partyTopicScores?: Record<string, number>; // topicId → 0–100 for this party
  answeredTopicIds?: string[];
  showTopicBreakdown?: boolean;
};

const COLORS = {
  blue:    { highlight: "bg-blue-50 border-blue-300",       bar: "bg-blue-400",    score: "text-blue-700",    link: "text-blue-500"   },
  emerald: { highlight: "bg-emerald-50 border-emerald-300", bar: "bg-emerald-400", score: "text-emerald-700", link: "text-emerald-600" },
  amber:   { highlight: "bg-amber-50 border-amber-300",     bar: "bg-amber-400",   score: "text-amber-700",   link: "text-amber-600"  },
  purple:  { highlight: "bg-purple-50 border-purple-300",   bar: "bg-purple-400",  score: "text-purple-700",  link: "text-purple-600" },
  teal:    { highlight: "bg-teal-50 border-teal-300",       bar: "bg-teal-400",    score: "text-teal-700",    link: "text-teal-600"   },
};

export default function PartyResultCard({ party, rank, accentColor, aiBlurb, aiLoading, groundingData, topicAnswerTexts, partyTopicScores, answeredTopicIds, showTopicBreakdown }: Props) {
  const c = COLORS[accentColor];
  const isTop = rank === 0;
  const [groundingOpen, setGroundingOpen] = useState(false);

  const hasGrounding = (groundingData?.topics?.length ?? 0) > 0;
  const isOutdated = hasGrounding && groundingData?.platformAvailable === false;
  const sourceQuality = groundingData?.sourceQuality;
  const isLowQualitySource = sourceQuality === "thirdParty" || sourceQuality === "outdated";
  const sourceLinkLabel =
    sourceQuality === "official"
      ? (party.platformLabel ?? "מצע רשמי")
      : sourceQuality === "outdated"
      ? "מסמך ישן"
      : sourceQuality === "thirdParty"
      ? "מקור חיצוני"
      : (party.platformLabel ?? "מקור");

  const accordionLabel =
    sourceQuality === "official" && groundingData?.platformAvailable === true
      ? "מה כתוב במצע?"
      : sourceQuality === "official"
      ? "מה כתוב בפרסומי המפלגה? (למפלגה אין מצע רשמי)"
      : sourceQuality === "thirdParty"
      ? "מה ידוע על עמדות המפלגה? (למפלגה אין מצע רשמי)"
      : sourceQuality === "outdated"
      ? "מה ידוע על עמדות המפלגה? (למפלגה אין מצע מעודכן בשנים האחרונות)"
      : "מה כתוב בפרסומי המפלגה?";

  return (
    <div className={`rounded-xl p-4 ${isTop ? `border-2 ${c.highlight}` : "bg-white border border-gray-200"}`}>
      {/* Header row */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="font-semibold">{rank + 1}. {party.name}</span>
          {party.subtitle && (
            <span className="text-xs text-gray-400 mr-2">({party.subtitle})</span>
          )}
        </div>
        <span className={`font-bold ${c.score}`}>{party.score}%</span>
      </div>

      {/* Score bar */}
      <div
        className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2"
        role="progressbar"
        aria-valuenow={party.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`ציון התאמה ${party.score}%`}
      >
        <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${party.score}%` }} />
      </div>

      {/* Per-topic breakdown chips */}
      {showTopicBreakdown && answeredTopicIds && partyTopicScores && (
        <div className="flex flex-wrap gap-1 mb-3" dir="rtl">
          {answeredTopicIds.map((topicId) => {
            const pct = partyTopicScores[topicId];
            const shortLabel = TOPIC_LABELS[topicId]?.split(" ")[0] ?? topicId;
            if (pct === undefined) {
              return (
                <span
                  key={topicId}
                  className="px-1.5 py-0.5 rounded border text-xs leading-none bg-gray-50 border-gray-200 text-gray-300"
                  title={`${TOPIC_LABELS[topicId]}: אין מידע זמין`}
                >
                  {shortLabel} —
                </span>
              );
            }
            const chip =
              pct >= 60
                ? { cls: "bg-green-50 border-green-200 text-green-700", symbol: "✓" }
                : pct < 40
                ? { cls: "bg-red-50 border-red-200 text-red-600", symbol: "✕" }
                : { cls: "bg-gray-50 border-gray-200 text-gray-400", symbol: "~" };
            return (
              <span
                key={topicId}
                className={`px-1.5 py-0.5 rounded border text-xs leading-none ${chip.cls}`}
                title={`${TOPIC_LABELS[topicId]}: ${pct}%`}
              >
                {shortLabel} {chip.symbol}
              </span>
            );
          })}
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-gray-500 mb-2">{party.description}</p>

      {/* AI blurb */}
      {(aiLoading || aiBlurb) && (
        <div className="mt-1 mb-2 pt-2 border-t border-gray-100">
          {aiLoading && !aiBlurb ? (
            <p className="text-xs text-indigo-300 animate-pulse">✦ מנתח התאמה...</p>
          ) : (
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="text-indigo-400 mr-1">✦</span>{aiBlurb}
            </p>
          )}
        </div>
      )}

      {/* Links row */}
      <div className="flex gap-4 flex-wrap items-center mb-2">
        {party.website ? (
          <a href={party.website} target="_blank" rel="noopener noreferrer" className={`text-xs ${c.link} hover:underline`}>
            אתר המפלגה ↗
          </a>
        ) : (
          <span className="text-xs text-gray-300">אתר לא ידוע</span>
        )}
        {party.platformUrl && !isLowQualitySource ? (
          <a href={party.platformUrl} target="_blank" rel="noopener noreferrer" className={`text-xs ${c.link} hover:underline`}>
            {party.platformLabel ?? "מצע רשמי"} ↗
          </a>
        ) : isLowQualitySource ? (
          <span className="text-xs text-red-400 font-medium">
            {sourceQuality === "outdated" ? "מקורות מיושנים" : "מקורות חיצוניים"}
          </span>
        ) : hasGrounding ? (
          <span className="text-xs text-amber-500">ללא מצע רשמי</span>
        ) : (
          <span className="text-xs text-red-400 font-medium">אין מצע מפורסם</span>
        )}
      </div>

      {/* Grounding accordion trigger */}
      {hasGrounding && (
        <div className="mt-2 border-t border-gray-100 pt-2">
          <button
            onClick={() => setGroundingOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full text-right focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none rounded"
            aria-expanded={groundingOpen}
            aria-label={`${party.name} — ${accordionLabel}`}
          >
            <span className="flex-1 text-right">{accordionLabel}</span>
            <span className="text-gray-300">{groundingOpen ? "▲" : "▼"}</span>
          </button>

          {groundingOpen && (
            <div className="mt-3 space-y-4">
              {/* Outdated platform warning */}
              {isOutdated && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">⚠️ המפלגה לא פרסמה מצע בחירות עדכני.</span>{" "}
                  ציטוטים אלה מבוססים על מסמכים ישנים ועלולים שלא לשקף את עמדותיה הנוכחיות.
                </div>
              )}

              {/* Topic-grouped quotes */}
              {groundingData!.topics.map((tg) => (
                <div key={tg.topicId}>
                  <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                    {tg.topicLabel}
                  </p>
                  {topicAnswerTexts?.[tg.topicId] && (
                    <p className="text-xs text-gray-400 italic mb-1.5 border-r-2 border-teal-200 pr-2">
                      ענית: {topicAnswerTexts[tg.topicId]}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mb-1">עמדת המפלגה במסמכיה:</p>
                  <div className="space-y-2">
                    {tg.entries.map((e, i) => (
                      <div key={i} className="border-r-2 border-gray-200 pr-3">
                        {e.contrary && (
                          <p className="text-xs text-red-400 font-medium mb-0.5">המפלגה מתנגדת לכך</p>
                        )}
                        <p className="text-xs text-gray-700 leading-relaxed">
                          &ldquo;{e.text}&rdquo;
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <a
                            href={e.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                          >
                            מקור — {sourceLinkLabel} ↗
                          </a>
                          <span className="text-xs text-gray-300">{e.dateRetrieved}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
