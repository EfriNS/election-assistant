"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PARTIES } from "@/lib/parties";
import { QUESTIONS_FORMAL, QUESTIONS_PERSONAL, TOPIC_KEY_DIMENSIONS, TopicQ } from "@/lib/questions";
import { getGroundingsForTopic } from "@/lib/groundings";
import { calcResults, TopicQA } from "@/lib/scoring";
import { track } from "@vercel/analytics/react";
import PrioritiesStep, { TOPICS, MIN_IMPORTANT } from "@/components/PrioritiesStep";
import UnifiedResultsPage from "@/components/UnifiedResultsPage";
import { TermHint } from "@/components/TermHint";

// ─── Types ─────────────────────────────────────────────────────────────────────

type FollowUpQ = { question: string; options: string[]; hint?: string; targetedAspect?: string };
type Step = "rank" | "questions" | "close" | "results";

// TopicQA is defined in lib/scoring.ts and re-exported via the import above

const BUCKET_LABELS: Record<number, string> = {
  4: "קריטי", 3: "חשוב מאוד", 2: "חשוב", 1: "פחות חשוב",
};

const OTHER_OPTION = "אחר — פרט";
const FOLLOW_UP_HARD_CAP = 4;

const LOADING_VERBS_FORMAL = ["מנתח...", "שוקל...", "חושב...", "מגבש..."];
const LOADING_VERBS_PERSONAL = ["מקשיב...", "מעכל...", "מהרהר...", "מתבשל...", "מתפלסף..."];

// ─── Scoring — see lib/scoring.ts ────────────────────────────────────────────

function buildAnswersSummary(
  buckets: Record<string, number>,
  topicQA: Record<string, TopicQA>,
  closeText: string,
  questionSet: Record<string, TopicQ>
): string {
  const lines = TOPICS
    .filter((t) => (buckets[t.id] ?? 0) > 0)
    .sort((a, b) => (buckets[b.id] ?? 0) - (buckets[a.id] ?? 0))
    .map((t) => {
      const weight = buckets[t.id];
      const qa = topicQA[t.id];
      const answerText =
        qa?.openerAnswerText ||
        questionSet[t.id]?.options.find((o) => o.id === qa?.openerAnswerId)?.text ||
        "לא ענה";
      let result = `${t.label} (${BUCKET_LABELS[weight]}): ${answerText}`;
      (qa?.followUps ?? []).forEach((fq) => {
        result += `\n  → ${fq.question}: ${fq.answer}`;
      });
      return result;
    });

  if (closeText.trim()) lines.push(`\nהערת המשתמש: ${closeText.trim()}`);
  return lines.join("\n");
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function CyclingVerb({ verbs }: { verbs: string[] }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * verbs.length));
  useEffect(() => {
    const id = setInterval(() => setIdx((v) => (v + 1) % verbs.length), 1400);
    return () => clearInterval(id);
  }, [verbs.length]);
  return <>{verbs[idx]}</>;
}

interface QuestionHeaderProps {
  questionIndex: number;
  totalSteps: number;
  progressPct: number;
  onBack: () => void;
}

function QuestionHeader({ questionIndex, totalSteps, progressPct, onBack }: QuestionHeaderProps) {
  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none rounded">← חזרה</button>
        <span className="text-sm text-gray-400" dir="ltr">{questionIndex + 1} / {totalSteps}</span>
      </div>
      <div
        className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="התקדמות בשאלון"
      >
        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>
    </>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────

function PrototypeEInner() {
  const searchParams = useSearchParams();
  const tone = searchParams.get("tone") ?? "formal";
  const depth = searchParams.get("depth") ?? "short";
  const questionSet = tone === "personal" ? QUESTIONS_PERSONAL : QUESTIONS_FORMAL;

  const [step, setStep] = useState<Step>("rank");
  const [buckets, setBuckets] = useState<Record<string, number>>({});
  const [questionIndex, setQuestionIndex] = useState(0);

  // All Q&A collected per topic
  const [topicQA, setTopicQA] = useState<Record<string, TopicQA>>({});

  // Current question state
  const [currentFollowUp, setCurrentFollowUp] = useState<FollowUpQ | null>(null);
  const [currentPrologue, setCurrentPrologue] = useState<string | null>(null);
  const [followUpsAskedThisTopic, setFollowUpsAskedThisTopic] = useState(0);
  const [loading, setLoading] = useState(false);

  // "אחר — פרט" input state
  const [showOpenerInput, setShowOpenerInput] = useState(false);
  const [openerDraft, setOpenerDraft] = useState("");
  const [showFollowUpInput, setShowFollowUpInput] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState("");

  const [closeText, setCloseText] = useState("");

  // AI-derived alignment scores from /api/score-topics (topicId → partyId → score or null)
  const [aiScores, setAiScores] = useState<Record<string, Record<string, number | null>> | undefined>(undefined);
  const [isScoring, setIsScoring] = useState(false);

  const topicsToAsk = Object.entries(buckets)
    .filter(([, w]) => w >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // Restore "Other" input when navigating back to an already-answered opener.
  // setState in effect body is intentional: syncing UI state from navigation history.
  useEffect(() => {
    if (step !== "questions" || currentFollowUp !== null) return;
    const tid = topicsToAsk[questionIndex];
    if (!tid) return;
    const qa = topicQA[tid];
    if (qa?.openerAnswerId === "other") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowOpenerInput(true);
      setOpenerDraft(qa.openerAnswerText ?? "");
    } else {
      setShowOpenerInput(false);
      setOpenerDraft("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, currentFollowUp, step]);

  // Fire /api/score-topics when entering the close step. This runs in the background while
  // the user writes their close-step text, hiding latency before results render.
  useEffect(() => {
    if (step !== "close") return;

    const topicsForScoring = topicsToAsk
      .filter((tid) => {
        const qa = topicQA[tid];
        if (!qa) return false;
        return qa.openerAnswerId === "other" || (qa.followUps?.length ?? 0) > 0;
      })
      .map((tid) => {
        const qa = topicQA[tid];
        const topic = TOPICS.find((t) => t.id === tid)!;
        return {
          topicId: tid,
          topicLabel: topic.label,
          openerQuestion: questionSet[tid]?.question ?? "",
          openerAnswer: qa.openerAnswerText,
          followUpQA: qa.followUps.map(({ question, answer }) => ({ question, answer })),
        };
      });

    if (topicsForScoring.length === 0) return;

    let active = true;
    async function runScoring() {
      setIsScoring(true);
      try {
        const r = await fetch("/api/score-topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topics: topicsForScoring }),
        });
        const data = await r.json() as { scores?: Record<string, Record<string, number | null>>; errorCode?: string };
        if (active && data.scores) setAiScores(data.scores);
      } catch {
        // silently degrade: calcResults falls back to deterministic-only
      } finally {
        if (active) setIsScoring(false);
      }
    }
    runScoring();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Build conversation history for API ──────────────────────────────────────
  const buildConversationSoFar = (upToIndex: number) =>
    topicsToAsk.slice(0, upToIndex).map((tid) => {
      const topic = TOPICS.find((t) => t.id === tid)!;
      const qa = topicQA[tid];
      return {
        topicLabel: topic.label,
        openerQuestion: questionSet[tid]?.question ?? "",
        openerAnswer: qa?.openerAnswerText ?? "",
        followUpQA: (qa?.followUps ?? []).map(({ question, answer }) => ({ question, answer })),
      };
    });

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const advanceToNextTopic = (prologue: string | null) => {
    track("topic_completed", { topicId: topicsToAsk[questionIndex] });
    setCurrentFollowUp(null);
    setCurrentPrologue(prologue);
    setFollowUpsAskedThisTopic(0);
    setShowOpenerInput(false);
    setOpenerDraft("");
    setShowFollowUpInput(false);
    setFollowUpDraft("");

    const next = questionIndex + 1;
    if (next < topicsToAsk.length) {
      setQuestionIndex(next);
    } else {
      setStep("close");
    }
  };

  const goBack = () => {
    setShowOpenerInput(false);
    setOpenerDraft("");
    setShowFollowUpInput(false);
    setFollowUpDraft("");
    setCurrentPrologue(null);

    if (currentFollowUp !== null) {
      // On a follow-up: go back to the previous follow-up, or opener if none
      const tid = topicsToAsk[questionIndex];
      const stored = topicQA[tid]?.followUps ?? [];
      if (stored.length > 0) {
        const prev = stored[stored.length - 1];
        setCurrentFollowUp({ question: prev.question, options: prev.options, hint: prev.hint });
        setFollowUpsAskedThisTopic(stored.length);
        setTopicQA((qa) => ({
          ...qa,
          [tid]: { ...qa[tid], followUps: stored.slice(0, -1) },
        }));
      } else {
        setCurrentFollowUp(null);
        setFollowUpsAskedThisTopic(0);
        // useEffect restores "other" textarea if needed
      }
    } else {
      // On an opener
      if (questionIndex === 0) {
        setStep("rank");
      } else {
        const prevTopicId = topicsToAsk[questionIndex - 1];
        const prevStored = topicQA[prevTopicId]?.followUps ?? [];
        setQuestionIndex((i) => i - 1);
        if (prevStored.length > 0) {
          const prev = prevStored[prevStored.length - 1];
          setCurrentFollowUp({ question: prev.question, options: prev.options, hint: prev.hint });
          setFollowUpsAskedThisTopic(prevStored.length);
          setTopicQA((qa) => ({
            ...qa,
            [prevTopicId]: { ...qa[prevTopicId], followUps: prevStored.slice(0, -1) },
          }));
        } else {
          setCurrentFollowUp(null);
          setFollowUpsAskedThisTopic(0);
        }
      }
    }
  };

  // ── Shared API call ─────────────────────────────────────────────────────────
  const callFollowUpAPI = async (
    topicId: string,
    openerAnswerText: string,
    followUpQA: { question: string; options: string[]; hint?: string; answer: string }[],
    askedCount: number,
    openerAnswerId?: string
  ) => {
    const topic = TOPICS.find((t) => t.id === topicId)!;
    const nextTopicId = topicsToAsk[questionIndex + 1] ?? null;

    const groundingMap = getGroundingsForTopic(topicId);
    const openerIsFreeText = openerAnswerId === "other";

    // Fix stale-state: React hasn't flushed the current opener into topicQA yet.
    // Inject it synthetically so calcResults sees the correct close-party scores.
    const syntheticTopicQA: Record<string, TopicQA> = openerIsFreeText
      ? topicQA
      : {
          ...topicQA,
          [topicId]: {
            openerAnswerId: openerAnswerId ?? "",
            openerAnswerText,
            followUps: followUpQA,
            coveredAspects: topicQA[topicId]?.coveredAspects,
          },
        };

    const currentRankings = calcResults(buckets, syntheticTopicQA, questionSet);
    const currentScores = Object.fromEntries(currentRankings.map((p) => [p.id, p.score]));

    // Filter grounding data to close parties only (top-5 + within 20 pts of 5th place).
    // This prevents the AI from seeing groundings for irrelevant parties.
    const scoreEntries = Object.entries(currentScores).sort((a, b) => b[1] - a[1]);
    const top5MinScore = scoreEntries[4]?.[1] ?? 0;
    const closePartyIds = new Set(
      scoreEntries
        .filter(([, s]) => s >= top5MinScore - 20)
        .map(([id]) => id)
    );

    const partyGroundings = PARTIES
      .filter((p) => closePartyIds.has(p.id) && (groundingMap[p.id]?.length ?? 0) > 0)
      .map((p) => ({
        partyId: p.id,
        partyName: p.name,
        entries: groundingMap[p.id].map((e) => ({
          text: e.text,
          aspect: e.aspect,
          contrary: e.contrary,
        })),
      }));

    // Compute the suggested next dimension: first uncovered key dimension where
    // at least one close party has grounding data. This gives the AI a concrete
    // starting point while still allowing intelligent deviation.
    const coveredAspects = topicQA[topicId]?.coveredAspects ?? [];
    const uncoveredKeyDims = (TOPIC_KEY_DIMENSIONS[topicId] ?? [])
      .filter((d) => !coveredAspects.includes(d));

    const suggestedNextDimension: string | null =
      uncoveredKeyDims.find((dim) =>
        [...closePartyIds].some((pid) =>
          (groundingMap[pid] ?? []).some((e) => e.aspect === dim && !e.absent)
        )
      ) ?? uncoveredKeyDims[0] ?? null;

    const res = await fetch("/api/follow-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationSoFar: buildConversationSoFar(questionIndex),
        currentTopic: {
          label: topic.label,
          openerQuestion: questionSet[topicId]?.question ?? "",
          openerAnswer: openerAnswerText,
          freeTextInterpretation: topicQA[topicId]?.freeTextInterpretation,
          followUpQA: followUpQA.map(({ question, answer }) => ({ question, answer })),
        },
        nextTopic: nextTopicId
          ? {
              label: TOPICS.find((t) => t.id === nextTopicId)?.label ?? nextTopicId,
              question: questionSet[nextTopicId]?.question ?? "",
            }
          : null,
        tone,
        depth,
        followUpsAskedThisTopic: askedCount,
        partyGroundings,
        currentScores,
        suggestedNextDimension,
        uncoveredKeyDims,
        openerIsFreeText,
      }),
    });

    return res.json() as Promise<{
      prologue: string | null;
      followUp: FollowUpQ | null;
      freeTextInterpretation?: string;
    }>;
  };

  // ── Opener answer handlers ──────────────────────────────────────────────────
  // Step 1: mark a structured option as selected (no API call — user can change mind)
  const selectOpenerOption = (optionId: string, optionText: string) => {
    const topicId = topicsToAsk[questionIndex];
    setTopicQA((prev) => ({
      ...prev,
      [topicId]: { openerAnswerId: optionId, openerAnswerText: optionText, followUps: [] },
    }));
    setShowOpenerInput(false);
    setOpenerDraft("");
  };

  // Step 2: confirm selection and call API (triggered by "המשך" button or free-text submit)
  const handleOpenerAnswer = async (optionId: string, optionText: string) => {
    const topicId = topicsToAsk[questionIndex];

    setTopicQA((prev) => ({
      ...prev,
      [topicId]: { openerAnswerId: optionId, openerAnswerText: optionText, followUps: [] },
    }));
    setShowOpenerInput(false);
    setOpenerDraft("");
    setLoading(true);

    try {
      const data = await callFollowUpAPI(topicId, optionText, [], 0, optionId);
      if (data.followUp?.question) {
        setCurrentPrologue(data.prologue ?? null);
        setCurrentFollowUp(data.followUp);
        setFollowUpsAskedThisTopic(1);
        if (data.followUp.targetedAspect || data.freeTextInterpretation) {
          setTopicQA((prev) => ({
            ...prev,
            [topicId]: {
              ...prev[topicId],
              ...(data.followUp!.targetedAspect
                ? { coveredAspects: [...(prev[topicId]?.coveredAspects ?? []), data.followUp!.targetedAspect] }
                : {}),
              ...(data.freeTextInterpretation
                ? { freeTextInterpretation: data.freeTextInterpretation }
                : {}),
            },
          }));
        }
      } else {
        advanceToNextTopic(data.prologue ?? null);
      }
    } catch {
      advanceToNextTopic(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Follow-up answer handler ────────────────────────────────────────────────
  const handleFollowUpAnswer = async (answerText: string) => {
    const topicId = topicsToAsk[questionIndex];
    const answeredFollowUp = currentFollowUp!;

    const newFollowUps = [
      ...(topicQA[topicId]?.followUps ?? []),
      { question: answeredFollowUp.question, options: answeredFollowUp.options, hint: answeredFollowUp.hint, answer: answerText },
    ];
    setTopicQA((prev) => ({
      ...prev,
      [topicId]: { ...prev[topicId], followUps: newFollowUps },
    }));
    setCurrentFollowUp(null);
    setShowFollowUpInput(false);
    setFollowUpDraft("");

    // Hard cap — skip API call
    if (followUpsAskedThisTopic >= FOLLOW_UP_HARD_CAP) {
      advanceToNextTopic(null);
      return;
    }

    setLoading(true);
    try {
      const data = await callFollowUpAPI(
        topicId,
        topicQA[topicId]?.openerAnswerText ?? "",
        newFollowUps,
        followUpsAskedThisTopic,
        topicQA[topicId]?.openerAnswerId
      );
      if (data.followUp?.question) {
        setCurrentPrologue(data.prologue ?? null);
        setCurrentFollowUp(data.followUp);
        setFollowUpsAskedThisTopic((n) => n + 1);
        if (data.followUp.targetedAspect) {
          setTopicQA((prev) => ({
            ...prev,
            [topicId]: {
              ...prev[topicId],
              coveredAspects: [...(prev[topicId]?.coveredAspects ?? []), data.followUp!.targetedAspect!],
            },
          }));
        }
      } else {
        advanceToNextTopic(data.prologue ?? null);
      }
    } catch {
      advanceToNextTopic(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Rank step ────────────────────────────────────────────────────────────────
  if (step === "rank") {
    return (
      <PrioritiesStep
        buckets={buckets}
        setBuckets={setBuckets}
        accentColor="teal"
        onBack={() => { track("quiz_abandoned", { step: "rank" }); window.location.href = "/"; }}
        onContinue={() => { track("quiz_started", { tone, depth }); setQuestionIndex(0); setStep("questions"); }}
      />
    );
  }

  // ── Close step ───────────────────────────────────────────────────────────────
  if (step === "close") {
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <button
            onClick={() => {
              setStep("questions");
              setQuestionIndex(topicsToAsk.length - 1);
              setCurrentFollowUp(null);
              setCurrentPrologue(null);
              setFollowUpsAskedThisTopic(0);
            }}
            className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← חזרה</button>
          <h2 className="text-xl font-bold mb-3">משהו שרצית להוסיף?</h2>
          <p className="text-sm text-gray-500 mb-6">
            אם יש עמדה חשובה שלא עלתה, אפשר לכתוב כאן — זה יעזור לקבל המלצה מדויקת יותר.
          </p>
          {currentPrologue && (
            <p className="text-sm text-gray-600 leading-relaxed mb-6 italic">{currentPrologue}</p>
          )}
          <textarea value={closeText} onChange={(e) => setCloseText(e.target.value)}
            data-hj-allow
            placeholder="כאן תוכל לכתוב בחופשיות..."
            className="w-full border border-gray-300 rounded-xl p-4 text-sm leading-relaxed h-36 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 mb-4"
            dir="rtl" />
          <button onClick={() => { track("quiz_completed", { topicCount: topicsToAsk.length }); setStep("results"); }}
            className="w-full bg-teal-600 text-white py-4 rounded-xl font-semibold hover:bg-teal-700 transition-colors">
            ← לתוצאות
          </button>
        </div>
      </main>
    );
  }

  // ── Results step ─────────────────────────────────────────────────────────────
  if (step === "results") {
    if (isScoring) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4">
          <p className="text-sm text-teal-500 animate-pulse">מחשב תוצאות מדויקות...</p>
        </main>
      );
    }
    return (
      <UnifiedResultsPage
        results={calcResults(buckets, topicQA, questionSet, aiScores)}
        userAnswersSummary={buildAnswersSummary(buckets, topicQA, closeText, questionSet)}
        answeredTopicIds={topicsToAsk.filter((tid) => topicQA[tid])}
        topicAnswerTexts={Object.fromEntries(
          topicsToAsk
            .filter((tid) => topicQA[tid]?.openerAnswerText)
            .map((tid) => [tid, topicQA[tid].openerAnswerText])
        )}
        accentColor="teal"
        onBack={() => setStep("close")}
      />
    );
  }

  // ── Questions step ────────────────────────────────────────────────────────────
  const topicId = topicsToAsk[questionIndex];
  const topic = TOPICS.find((t) => t.id === topicId)!;
  const q = questionSet[topicId];
  const bucketLabel = BUCKET_LABELS[buckets[topicId] ?? 0];
  const totalSteps = topicsToAsk.length;
  const progressPct = ((questionIndex + (currentFollowUp ? 0.5 : 0)) / totalSteps) * 100;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    const verbs = tone === "personal" ? LOADING_VERBS_PERSONAL : LOADING_VERBS_FORMAL;
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <QuestionHeader questionIndex={questionIndex} totalSteps={totalSteps} progressPct={progressPct} onBack={goBack} />
          <p className="text-sm text-teal-500 animate-pulse text-center mt-16"><CyclingVerb verbs={verbs} /></p>
        </div>
      </main>
    );
  }

  // ── Follow-up question ───────────────────────────────────────────────────────
  if (currentFollowUp) {
    const openerAnswerText = topicQA[topicId]?.openerAnswerText;
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <QuestionHeader questionIndex={questionIndex} totalSteps={totalSteps} progressPct={progressPct} onBack={goBack} />

          {/* Topic + follow-up label */}
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xs font-medium text-teal-600 uppercase tracking-wider">{topic.label}</p>
            <span className="text-xs text-gray-400">↳ שאלת המשך</span>
          </div>

          {/* Opener answer recap */}
          {openerAnswerText && (
            <div className="border-r-2 border-teal-200 pr-3 mb-5">
              <p className="text-xs text-gray-400 mb-0.5">ענית:</p>
              <p className="text-sm text-gray-500 leading-snug">{openerAnswerText}</p>
            </div>
          )}

          {currentPrologue && (
            <p className="text-sm text-gray-600 leading-relaxed mb-6">{currentPrologue}</p>
          )}

          <h2 className="text-xl font-bold leading-snug mb-3">{currentFollowUp.question}</h2>
          {currentFollowUp.hint && (
            <div className="mb-6">
              <TermHint definition={currentFollowUp.hint} />
            </div>
          )}

          <div className="flex flex-col gap-3 mb-4">
            {currentFollowUp.options.map((opt, i) => {
              const isOther = opt === OTHER_OPTION;
              const num = i + 1;
              if (isOther) {
                return (
                  <div key={i} className={`border-2 rounded-xl px-5 py-4 flex items-start gap-3 transition-all ${
                    followUpDraft.trim() ? "border-teal-400 bg-teal-50" : "border-gray-200"
                  }`}>
                    <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-semibold mt-0.5 ${
                      followUpDraft.trim() ? "border-teal-400 text-teal-600" : "border-gray-400 text-gray-700"
                    }`}>{num}</span>
                    <div className="flex-1">
                      <textarea
                        data-hj-allow
                        value={followUpDraft}
                        onChange={(e) => setFollowUpDraft(e.target.value)}
                        placeholder={`כתבו בחופשיות — למשל: "1+3, אבל לא..." או עמדה אחרת לגמרי`}
                        className="w-full text-sm resize-none bg-transparent focus:outline-none placeholder-gray-400 leading-snug text-right"
                        rows={2}
                        dir="rtl"
                      />
                      {followUpDraft.trim() && (
                        <button
                          onClick={() => handleFollowUpAnswer(followUpDraft.trim())}
                          className="mt-2 w-full bg-teal-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:outline-none"
                        >
                          המשך ←
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              return (
                <button key={i} onClick={() => handleFollowUpAnswer(`${num}. ${opt}`)}
                  className="border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 rounded-xl py-4 px-5 font-medium text-sm leading-snug transition-all flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none">
                  <span className="shrink-0 w-7 h-7 rounded-full border-2 border-gray-400 text-gray-700 flex items-center justify-center text-sm font-semibold">{num}</span>
                  <span className="flex-1 text-right leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>

          <button onClick={() => advanceToNextTopic(null)}
            className="w-full text-sm text-gray-500 border border-gray-200 rounded-lg px-4 py-2 hover:border-gray-300 hover:text-gray-600 transition-all text-center focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none">
            דלג על שאלה זו
          </button>
        </div>
      </main>
    );
  }

  // ── Opener question ──────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <QuestionHeader questionIndex={questionIndex} totalSteps={totalSteps} progressPct={progressPct} onBack={goBack} />

        <div className="flex items-center gap-2 mb-3">
          {bucketLabel && (
            <span className="text-xs text-white bg-teal-600 rounded-full px-2 py-0.5 shrink-0">
              {bucketLabel}
            </span>
          )}
          <p className="text-xs font-medium text-teal-700 uppercase tracking-wider">{topic.label}</p>
        </div>

        {currentPrologue && (
          <p className="text-sm text-gray-600 leading-relaxed mb-6">{currentPrologue}</p>
        )}

        <h2 className="text-xl font-bold leading-snug mb-8">{q.question}</h2>

        <div className="flex flex-col gap-3 mb-4">
          {q.options.map((opt, i) => {
            const selected = topicQA[topicId]?.openerAnswerId === opt.id;
            const num = i + 1;
            return (
              <div key={opt.id}>
                <button
                  onClick={() => selectOpenerOption(opt.id, `${num}. ${opt.text}`)}
                  className={`w-full border-2 rounded-xl py-4 px-5 font-medium text-sm leading-snug transition-all flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none ${
                    selected
                      ? "border-teal-500 bg-teal-50 text-teal-900"
                      : "border-gray-200 hover:border-teal-400 hover:bg-teal-50"
                  }`}
                >
                  <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${
                    selected ? "border-teal-400 text-teal-600" : "border-gray-400 text-gray-700"
                  }`}>{num}</span>
                  <span className="flex-1 text-right leading-snug">{opt.text}</span>
                </button>
                {opt.hint && (
                  <div className="mt-1.5 mr-3 border-r-2 border-teal-100 pr-2">
                    <TermHint definition={opt.hint} label={opt.term ? `מה זה "${opt.term}"?` : "מה זה אומר?"} />
                  </div>
                )}
              </div>
            );
          })}

          {/* "כתבו בעצמכם" — always-open free text */}
          <div className={`border-2 rounded-xl px-5 py-4 flex items-start gap-3 transition-all ${
            topicQA[topicId]?.openerAnswerId === "other" || openerDraft.trim()
              ? "border-teal-400 bg-teal-50"
              : "border-gray-200"
          }`}>
            <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-semibold mt-0.5 ${
              topicQA[topicId]?.openerAnswerId === "other" || openerDraft.trim()
                ? "border-teal-400 text-teal-600"
                : "border-gray-400 text-gray-700"
            }`}>{q.options.length + 1}</span>
            <div className="flex-1">
              <textarea
                data-hj-allow
                value={openerDraft}
                onChange={(e) => setOpenerDraft(e.target.value)}
                placeholder={`כתבו בחופשיות — למשל: "1+3, אבל לא..." או עמדה אחרת לגמרי`}
                className="w-full text-sm resize-none bg-transparent focus:outline-none placeholder-gray-400 leading-snug text-right"
                rows={2}
                dir="rtl"
              />
              {openerDraft.trim() && (
                <button
                  onClick={() => handleOpenerAnswer("other", openerDraft.trim())}
                  className="mt-2 w-full bg-teal-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  המשך ←
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Confirm selection button — appears after a structured option is chosen */}
        {topicQA[topicId]?.openerAnswerId && topicQA[topicId]?.openerAnswerId !== "other" && (
          <button
            onClick={() => handleOpenerAnswer(topicQA[topicId].openerAnswerId, topicQA[topicId].openerAnswerText)}
            className="w-full bg-teal-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-700 transition-colors focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:outline-none mb-3"
          >
            המשך ←
          </button>
        )}

        <button onClick={() => advanceToNextTopic(null)}
          className="w-full text-sm text-gray-500 border border-gray-200 rounded-lg px-4 py-2 hover:border-gray-300 hover:text-gray-600 transition-all text-center focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none">
          דלג על שאלה זו
        </button>
      </div>
    </main>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function PrototypeE() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">טוען...</div>}>
      <PrototypeEInner />
    </Suspense>
  );
}

export { MIN_IMPORTANT };
