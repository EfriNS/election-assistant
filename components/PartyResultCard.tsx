"use client";

import { useEffect, useRef, useState } from "react";
import { Party } from "@/lib/parties";
import { PartyGroundingResult, QUOTES_SHOWN_PER_TOPIC } from "@/lib/grounding-types";
import { TOPIC_LABELS } from "@/lib/topics";
import { GROUNDING_ARCHIVE_PUBLIC } from "@/lib/groundings";
import { formatHebrewDate } from "@/lib/format-date";
import { mpTrack } from "@/lib/mixpanel";
import { WarningIcon, ChevronIcon } from "@/components/icons";

const ARCHIVE_BASE_URL = "https://github.com/EfriNS/election-assistant/blob/main/";

type Props = {
  party: Party & { score: number; rawScore?: number; criticalConflicts?: string[] };
  rank: number;
  aiBlurb?: string;
  aiLoading?: boolean;
  groundingData?: PartyGroundingResult;
  topicAnswerTexts?: Record<string, string>;
  partyTopicScores?: Record<string, number>; // topicId → 0–100 for this party
  answeredTopicIds?: string[];
  showTopicBreakdown?: boolean;
};

// Single brand color — teal was deliberately chosen as one of the only colors
// with no Israeli political-party association; don't reintroduce a color prop.
const BRAND = { highlight: "bg-teal-50 border-teal-300", bar: "bg-teal-500", score: "text-teal-700", link: "text-teal-600" };

export default function PartyResultCard({ party, rank, aiBlurb, aiLoading, groundingData, topicAnswerTexts, partyTopicScores, answeredTopicIds, showTopicBreakdown }: Props) {
  const c = BRAND;
  const isTop = rank === 0;
  const [groundingOpen, setGroundingOpen] = useState(false);
  const [fullyShownTopics, setFullyShownTopics] = useState<Set<string>>(new Set());
  // Set by tapping a topic chip: the panel opens scrolled to that topic.
  const [highlightTopic, setHighlightTopic] = useState<string | null>(null);
  const topicSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!highlightTopic) return;
    topicSectionRefs.current[highlightTopic]?.scrollIntoView({ block: "start", behavior: "smooth" });
    const timer = setTimeout(() => setHighlightTopic(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightTopic]);

  const hasGrounding = (groundingData?.topics?.length ?? 0) > 0;
  const sourceQuality = groundingData?.sourceQuality;
  // Real evidentiary reliability gap — a stale or third-party-only source is a
  // bigger trust concern than "official material exists but has no single URL"
  // (that milder case gets amber below). Both read as red, with accurate text
  // per reason: "outdated" means a real old document from the party exists;
  // "thirdParty" means no official document ever existed for this — the quotes
  // are someone else's analysis, not the party's own words. Driven by
  // sourceQuality directly (not the loosely-related platformAvailable flag),
  // so it can't mismatch the same-file link-row badge below.
  const isLowQualitySource = sourceQuality === "thirdParty" || sourceQuality === "outdated";
  const sourceLinkLabel =
    sourceQuality === "official"
      ? (party.platformLabel ?? "מצע רשמי")
      : sourceQuality === "outdated"
      ? "מסמך ישן"
      : sourceQuality === "thirdParty"
      ? "מקור חיצוני"
      : (party.platformLabel ?? "מקור");

  const lastVerified = hasGrounding
    ? groundingData!.topics
        .flatMap((tg) => tg.entries.map((e) => e.dateRetrieved))
        .sort()
        .at(-1)
    : undefined;

  // Critical-topic conflicts surface first in the accordion, with a distinct
  // highlight — same underlying "ענית / עמדת המפלגה" pairing as any other
  // topic, just reordered so the reason for a capped score isn't buried.
  const sortedTopicGroups = hasGrounding
    ? [...groundingData!.topics].sort((a, b) => {
        const aGated = party.criticalConflicts?.includes(a.topicId) ? 0 : 1;
        const bGated = party.criticalConflicts?.includes(b.topicId) ? 0 : 1;
        return aGated - bGated;
      })
    : [];

  const quoteCount = sortedTopicGroups.reduce((n, tg) => n + tg.entries.length, 0);
  const topicIdsWithQuotes = new Set(sortedTopicGroups.map((tg) => tg.topicId));

  // The "see details" discoverability problem from user testing — expand-rate
  // per party/rank is the signal that it's been solved; `via` tells which
  // entry point (the button or a topic chip) earned the open.
  const openGrounding = (via: "button" | "chip", topicId?: string) => {
    if (!groundingOpen) {
      mpTrack("results_interaction", { action: "grounding_expanded", party_id: party.id, party_rank: rank + 1, via, ...(topicId ? { topic_id: topicId } : {}) });
    }
    setGroundingOpen(true);
  };

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
        <span className={`font-bold tabular-nums ${c.score}`}>{party.score}%</span>
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

      {/* Critical-topic conflict banner */}
      {party.criticalConflicts && party.criticalConflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 leading-relaxed mb-2 flex items-start gap-1.5">
          <WarningIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">מתנגשת עם עדיפות שסימנת כקריטית: </span>
            {party.criticalConflicts.map((id) => TOPIC_LABELS[id]).join(", ")}.
            {party.rawScore !== undefined && party.rawScore !== party.score && (
              <span className="text-red-400"> ציון ההתאמה הכולל מוגבל בגלל זה (לפני ההגבלה: {party.rawScore}%).</span>
            )}
          </span>
        </div>
      )}

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
            if (topicIdsWithQuotes.has(topicId)) {
              return (
                <button
                  key={topicId}
                  onClick={() => {
                    openGrounding("chip", topicId);
                    setHighlightTopic(topicId);
                  }}
                  className={`px-2 py-1 rounded border text-xs leading-none flex items-center gap-0.5 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none ${chip.cls}`}
                  title={`${TOPIC_LABELS[topicId]}: ${pct}%`}
                  aria-label={`${TOPIC_LABELS[topicId]}: ${pct}% — הצגת ציטוטים מהמצע`}
                >
                  {shortLabel} {chip.symbol} {pct}%
                  <ChevronIcon className="w-3 h-3 rotate-90 opacity-60" />
                </button>
              );
            }
            return (
              <span
                key={topicId}
                className={`px-1.5 py-0.5 rounded border text-xs leading-none ${chip.cls}`}
                title={`${TOPIC_LABELS[topicId]}: ${pct}%`}
              >
                {shortLabel} {chip.symbol} {pct}%
              </span>
            );
          })}
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-gray-500 mb-2">{party.description}</p>

      {/* AI blurb — neutral container like every other notice on this page;
          the teal ✦ marker alone signals "this is the AI's interpretation,"
          rather than a whole second brand color for AI content. */}
      {(aiLoading || aiBlurb) && (
        <div className="mt-1 mb-2 pt-2 border-t border-gray-100">
          {aiLoading && !aiBlurb ? (
            <p className="text-xs text-gray-400 animate-pulse"><span className="text-teal-500 mr-1">✦</span>מנתח התאמה...</p>
          ) : (
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="text-teal-500 mr-1">✦</span>{aiBlurb}
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
          <span className="text-xs text-gray-500">אתר לא ידוע</span>
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
            onClick={() => {
              if (groundingOpen) setGroundingOpen(false);
              else openGrounding("button");
            }}
            className="flex items-center gap-2 w-full text-right border border-teal-200 bg-teal-50/50 hover:bg-teal-50 transition-colors rounded-lg px-3 py-2 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
            aria-expanded={groundingOpen}
            aria-label={`${party.name} — ${accordionLabel}`}
          >
            <span className="flex-1 text-right">
              <span className="block text-sm font-medium text-teal-700">{accordionLabel}</span>
              <span className="block text-xs text-gray-500 mt-0.5">ציטוטים: {quoteCount} · נושאים: {sortedTopicGroups.length}</span>
            </span>
            <ChevronIcon className={`w-4 h-4 text-teal-500 transition-transform ${groundingOpen ? "-rotate-90" : "rotate-90"}`} />
          </button>
          {lastVerified && (
            <p className="text-xs text-gray-400 mt-1">מקורות עודכנו לאחרונה: {formatHebrewDate(lastVerified)}</p>
          )}

          {groundingOpen && (
            <div className="mt-3 space-y-4">
              {/* Low-reliability source warning — accurate per reason, not just "outdated" */}
              {isLowQualitySource && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800 leading-relaxed flex items-start gap-1.5">
                  <WarningIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {sourceQuality === "outdated" ? (
                      <>
                        <span className="font-semibold">המפלגה לא פרסמה מצע בחירות עדכני.</span>{" "}
                        ציטוטים אלה מבוססים על מסמכים ישנים ועלולים שלא לשקף את עמדותיה הנוכחיות.
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">למפלגה זו אין מצע רשמי משלה.</span>{" "}
                        הציטוטים מבוססים על ניתוח צד שלישי — לא על דברי המפלגה עצמה.
                      </>
                    )}
                  </span>
                </div>
              )}

              {/* Topic-grouped quotes — critical-conflict topics sort first and get a highlight */}
              {sortedTopicGroups.map((tg) => {
                const isGateTopic = party.criticalConflicts?.includes(tg.topicId);
                return (
                <div
                  key={tg.topicId}
                  ref={(el) => { topicSectionRefs.current[tg.topicId] = el; }}
                  className={`scroll-mt-4 rounded-lg transition-shadow ${isGateTopic ? "bg-red-50 border border-red-200 p-2" : ""} ${highlightTopic === tg.topicId ? "ring-2 ring-teal-300 ring-offset-4" : ""}`}
                >
                  {isGateTopic && (
                    <p className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1"><WarningIcon className="w-3.5 h-3.5" />נושא קריטי שגרם להגבלת הציון</p>
                  )}
                  <p className={`text-xs font-semibold mb-1 uppercase tracking-wide ${isGateTopic ? "text-red-700" : "text-gray-600"}`}>
                    {tg.topicLabel}
                  </p>
                  {topicAnswerTexts?.[tg.topicId] && (
                    <p className="text-xs text-gray-400 italic mb-1.5 border-r-2 border-teal-200 pr-2">
                      ענית: {topicAnswerTexts[tg.topicId]}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mb-1">עמדת המפלגה במסמכיה:</p>
                  <div className="space-y-2">
                    {(fullyShownTopics.has(tg.topicId) ? tg.entries : tg.entries.slice(0, QUOTES_SHOWN_PER_TOPIC)).map((e, i) => (
                      <div
                        key={i}
                        className={`border-r-2 pr-3 ${e.matched ? "border-teal-300" : "border-gray-200"}`}
                      >
                        {e.matched && (
                          <p className="text-xs text-teal-500 font-medium mb-0.5">↲ קשור לשאלת ההמשך שענית עליה</p>
                        )}
                        {e.contrary && (
                          <p className="text-xs text-red-400 font-medium mb-0.5">המפלגה מתנגדת ל: {e.contrary}</p>
                        )}
                        <p className="text-xs text-gray-700 leading-relaxed">
                          &ldquo;{e.text}&rdquo;
                        </p>
                        {e.provenance === "official-outdated" && (
                          <p className="text-xs text-amber-700 mt-1">
                            המקור הרשמי העדכני ביותר שאיתרנו למפלגה בנושא זה — עלול שלא לשקף את עמדתה הנוכחית.
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <a
                            href={e.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                          >
                            מקור — {sourceLinkLabel} ↗
                          </a>
                          {GROUNDING_ARCHIVE_PUBLIC && (
                            <a
                              href={`${ARCHIVE_BASE_URL}${e.archivePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                            >
                              ארכיון ↗
                            </a>
                          )}
                          <span className="text-xs text-gray-400">{formatHebrewDate(e.dateRetrieved)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {tg.entries.length > QUOTES_SHOWN_PER_TOPIC && (
                    <button
                      onClick={() => {
                        const showingAll = fullyShownTopics.has(tg.topicId);
                        if (!showingAll) mpTrack("results_interaction", { action: "grounding_topic_show_all", party_id: party.id, party_rank: rank + 1, topic_id: tg.topicId });
                        setFullyShownTopics((prev) => {
                          const next = new Set(prev);
                          if (showingAll) next.delete(tg.topicId);
                          else next.add(tg.topicId);
                          return next;
                        });
                      }}
                      className={`mt-2 text-xs ${c.link} hover:underline focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none rounded`}
                      aria-expanded={fullyShownTopics.has(tg.topicId)}
                    >
                      {fullyShownTopics.has(tg.topicId) ? "הצגת פחות" : `הצגת כל הציטוטים בנושא (${tg.entries.length})`}
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
