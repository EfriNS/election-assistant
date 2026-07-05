"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PARTIES } from "@/lib/parties";
import { QUESTIONS_FORMAL, QUESTIONS_PERSONAL, TOPIC_KEY_DIMENSIONS, TopicQ } from "@/lib/questions";
import { getGroundingsForTopic, getBestEvidenceForTopic, selectSuggestedDimension } from "@/lib/groundings";
import { calcResults, TopicQA } from "@/lib/scoring";
import { CRITICAL_WEIGHT } from "@/lib/topics";
import { mpIdentify, mpTrack } from "@/lib/mixpanel";
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

// Follow-up depth scales with how important the user marked the topic —
// a קריטי topic gets probed deeper than a merely-important one, at both
// depth settings. Deep mode's weight-2/3 caps are intentionally lower than
// the old flat cap-of-3: depth is concentrated where the user asked for it
// instead of spread evenly across every selected topic.
const FOLLOW_UP_CAPS: Record<string, Record<number, number>> = {
  short: { [CRITICAL_WEIGHT]: 2, 3: 1, 2: 1 },
  deep:  { [CRITICAL_WEIGHT]: 3, 3: 2, 2: 1 },
};

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

function LoadingIndicator({ verbs }: { verbs: string[] }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * verbs.length));
  useEffect(() => {
    const id = setInterval(() => setIdx((v) => (v + 1) % verbs.length), 1800);
    return () => clearInterval(id);
  }, [verbs.length]);

  return (
    <p className="text-sm text-center mt-16">
      {verbs[idx].split("").map((char, i) => (
        <span
          key={`${idx}-${i}`}
          className="inline-block animate-pulse text-teal-500"
          style={{ animationDelay: `${i * 80}ms`, animationDuration: "1.2s" }}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </p>
  );
}

interface QuestionHeaderProps {
  questionIndex: number;
  totalSteps: number;
  progressPct: number;
  onBack: () => void;
  isFollowUp?: boolean;
}

function QuestionHeader({ questionIndex, totalSteps, progressPct, onBack, isFollowUp }: QuestionHeaderProps) {
  const counterLabel = isFollowUp
    ? `נושא ${questionIndex + 1} מתוך ${totalSteps} • המשך`
    : `נושא ${questionIndex + 1} מתוך ${totalSteps}`;
  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none rounded">← חזרה</button>
        <span className="text-sm text-gray-400">{counterLabel}</span>
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

function QuizInner() {
  const searchParams = useSearchParams();
  const tone = searchParams.get("tone") ?? "formal";
  const depth = searchParams.get("depth") ?? "short";
  const questionSet = tone === "personal" ? QUESTIONS_PERSONAL : QUESTIONS_FORMAL;

  const [sessionId] = useState(() => crypto.randomUUID());

  // Identify this quiz session in Mixpanel and fire session-init event.
  // Runs once on mount; tone/depth are URL params and don't change.
  useEffect(() => {
    mpIdentify(sessionId, { tone, depth });
    mpTrack("quiz_session_init", { session_id: sessionId, tone, depth });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const [selectedFollowUpAnswer, setSelectedFollowUpAnswer] = useState<string | null>(null);

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

  // Reset per-question UI state whenever a new follow-up loads.
  // setState in effect body is intentional: syncing local UI state to a changing question.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedFollowUpAnswer(null);
    setFollowUpDraft("");
  }, [currentFollowUp]);

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
          ...(qa.freeTextInterpretation ? { freeTextInterpretation: qa.freeTextInterpretation } : {}),
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
          body: JSON.stringify({ topics: topicsForScoring, sessionId }),
        });
        const data = await r.json() as { scores?: Record<string, Record<string, number | null>>; errorCode?: string };
        if (active && data.scores) setAiScores(data.scores);
      } catch {
        // silently degrade: calcResults falls back to deterministic-only
      } finally {
        setIsScoring(false);
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
  type TopicCompletedProps = { followUpCount: number; openerWasFreeText: boolean; aspectsProbed: string[] };

  const advanceToNextTopic = (prologue: string | null, completed?: TopicCompletedProps) => {
    mpTrack("topic_completed", {
      session_id: sessionId,
      topic_id: topicsToAsk[questionIndex],
      topic_index: questionIndex,
      total_topics: topicsToAsk.length,
      follow_up_count: completed?.followUpCount ?? 0,
      opener_was_free_text: completed?.openerWasFreeText ?? false,
      aspects_probed: completed?.aspectsProbed ?? [],
    });
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

    const { ranked: currentRankings } = calcResults(buckets, syntheticTopicQA, questionSet);
    const currentScores = Object.fromEntries(currentRankings.map((p) => [p.id, p.score]));

    // Best evidence only per party: official material when it exists, third-party/
    // joint-list sources only as a fallback — same rule as scoring and quoting.
    // Deliberately NOT filtered to "close" parties by current running score — a
    // follow-up's job is to probe a potentially different axis than the opener
    // (e.g. territorial policy vs. security self-reliance), and gating grounding
    // by who's currently leading hid real, well-grounded positions from parties
    // who simply hadn't led on anything yet (2026-07-05 incident: a security
    // opener favoring self-reliance made every left-leaning party's genuine,
    // grounded withdrawal/1967-borders position invisible to the follow-up AI).
    const partyGroundings = PARTIES
      .filter((p) => (groundingMap[p.id]?.length ?? 0) > 0)
      .map((p) => ({
        partyId: p.id,
        partyName: p.name,
        entries: getBestEvidenceForTopic(p.id, topicId).map((e) => ({
          text: e.text,
          aspect: e.aspect,
          contrary: e.contrary,
        })),
      }));

    // Compute the suggested next dimension (see lib/groundings.ts's
    // selectSuggestedDimension for why this is NOT gated by current closeness).
    const coveredAspects = topicQA[topicId]?.coveredAspects ?? [];
    const uncoveredKeyDims = (TOPIC_KEY_DIMENSIONS[topicId] ?? [])
      .filter((d) => !coveredAspects.includes(d));

    const suggestedNextDimension = selectSuggestedDimension(uncoveredKeyDims, groundingMap);

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
        followUpCapForTopic: FOLLOW_UP_CAPS[depth]?.[buckets[topicId] ?? 2] ?? 1,
        topicWeightLabel: BUCKET_LABELS[buckets[topicId] ?? 2],
        partyGroundings,
        currentScores,
        suggestedNextDimension,
        uncoveredKeyDims,
        openerIsFreeText,
        sessionId,
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
        advanceToNextTopic(data.prologue ?? null, { followUpCount: 0, openerWasFreeText: optionId === "other", aspectsProbed: [] });
      }
    } catch {
      mpTrack("api_error", { session_id: sessionId, endpoint: "/api/follow-up", error_code: "SERVER_ERROR", topic_id: topicId, topic_index: questionIndex });
      advanceToNextTopic(null, { followUpCount: 0, openerWasFreeText: optionId === "other", aspectsProbed: [] });
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

    // Hard cap — skip API call. Scales with the topic's priority weight.
    const followUpHardCap = FOLLOW_UP_CAPS[depth]?.[buckets[topicId] ?? 2] ?? 1;
    if (followUpsAskedThisTopic >= followUpHardCap) {
      advanceToNextTopic(null, { followUpCount: newFollowUps.length, openerWasFreeText: topicQA[topicId]?.openerAnswerId === "other", aspectsProbed: topicQA[topicId]?.coveredAspects ?? [] });
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
        advanceToNextTopic(data.prologue ?? null, { followUpCount: newFollowUps.length, openerWasFreeText: topicQA[topicId]?.openerAnswerId === "other", aspectsProbed: topicQA[topicId]?.coveredAspects ?? [] });
      }
    } catch {
      mpTrack("api_error", { session_id: sessionId, endpoint: "/api/follow-up", error_code: "SERVER_ERROR", topic_id: topicId, topic_index: questionIndex });
      advanceToNextTopic(null, { followUpCount: newFollowUps.length, openerWasFreeText: topicQA[topicId]?.openerAnswerId === "other", aspectsProbed: topicQA[topicId]?.coveredAspects ?? [] });
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
        onBack={() => { mpTrack("quiz_abandoned", { session_id: sessionId, step: "rank", topics_completed_so_far: 0 }); window.location.href = "/"; }}
        onContinue={() => {
          mpTrack("priorities_submitted", {
            session_id: sessionId,
            tone,
            depth,
            topic_count: topicsToAsk.length,
            critical_count: Object.values(buckets).filter((w) => w === 4).length,
            very_important_count: Object.values(buckets).filter((w) => w === 3).length,
            important_count: Object.values(buckets).filter((w) => w === 2).length,
            low_count: Object.values(buckets).filter((w) => w === 1).length,
            ...Object.fromEntries(TOPICS.map((t) => [`${t.id}_bucket`, buckets[t.id] ?? 0])),
          });
          setQuestionIndex(0);
          setStep("questions");
        }}
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
            placeholder="כאן תוכל לכתוב בחופשיות..."
            className="w-full border border-gray-300 rounded-xl p-4 text-sm leading-relaxed h-36 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 mb-4"
            dir="rtl" />
          <button onClick={() => {
            mpTrack("quiz_completed", {
              session_id: sessionId,
              tone,
              depth,
              topics_selected: topicsToAsk.length,
              topics_completed: topicsToAsk.filter((tid) => topicQA[tid]).length,
              topics_missed: topicsToAsk.length - topicsToAsk.filter((tid) => topicQA[tid]).length,
              has_close_text: closeText.trim().length > 0,
            });
            setStep("results");
          }}
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
      const scoringVerbs = ["מחשב...", "מנתח...", "משווה...", "מגבש..."];
      return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4">
          <LoadingIndicator verbs={scoringVerbs} />
        </main>
      );
    }
    const { ranked: finalRanked, topicScores: finalTopicScores } = calcResults(buckets, topicQA, questionSet, aiScores);
    return (
      <UnifiedResultsPage
        results={finalRanked}
        topicScores={finalTopicScores}
        userAnswersSummary={buildAnswersSummary(buckets, topicQA, closeText, questionSet)}
        answeredTopicIds={topicsToAsk.filter((tid) => topicQA[tid])}
        topicCoveredAspects={Object.fromEntries(
          topicsToAsk
            .filter((tid) => topicQA[tid]?.coveredAspects?.length)
            .map((tid) => [tid, topicQA[tid].coveredAspects!])
        )}
        topicAnswerTexts={Object.fromEntries(
          topicsToAsk
            .filter((tid) => topicQA[tid]?.openerAnswerText)
            .map((tid) => {
              const qa = topicQA[tid];
              const followUpAnswers = (qa.followUps ?? []).map((fq) => fq.answer);
              return [tid, followUpAnswers.length > 0
                ? `${qa.openerAnswerText} | ${followUpAnswers.join(" | ")}`
                : qa.openerAnswerText];
            })
        )}
        accentColor="teal"
        sessionId={sessionId}
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
          <LoadingIndicator verbs={verbs} />
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
          <QuestionHeader questionIndex={questionIndex} totalSteps={totalSteps} progressPct={progressPct} onBack={goBack} isFollowUp />

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
              // Strip AI-added leading numbers ("1. ", "2) ", etc.) — our circles already number options.
              const displayOpt = opt.replace(/^\d+[\.\)]\s*/, "");
              const answerText = `${num}. ${displayOpt}`;
              const selected = selectedFollowUpAnswer === answerText;
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
                        value={followUpDraft}
                        onChange={(e) => { setFollowUpDraft(e.target.value); setSelectedFollowUpAnswer(null); }}
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
                <button key={i} onClick={() => { setSelectedFollowUpAnswer(answerText); setFollowUpDraft(""); }}
                  className={`border-2 rounded-xl py-4 px-5 font-medium text-sm leading-snug transition-all flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none ${
                    selected
                      ? "border-teal-500 bg-teal-50 text-teal-900"
                      : "border-gray-200 hover:border-teal-400 hover:bg-teal-50"
                  }`}>
                  <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${
                    selected ? "border-teal-400 text-teal-600" : "border-gray-400 text-gray-700"
                  }`}>{num}</span>
                  <span className="flex-1 text-right leading-snug">{displayOpt}</span>
                </button>
              );
            })}
          </div>

          {selectedFollowUpAnswer && (
            <button
              onClick={() => handleFollowUpAnswer(selectedFollowUpAnswer)}
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

export default function Quiz() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">טוען...</div>}>
      <QuizInner />
    </Suspense>
  );
}

export { MIN_IMPORTANT };
