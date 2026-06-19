"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PARTIES } from "@/lib/parties";
import { QUESTIONS_FORMAL, QUESTIONS_PERSONAL, TopicQ } from "@/lib/questions";
import PrioritiesStep, { TOPICS, MIN_IMPORTANT } from "@/components/PrioritiesStep";
import UnifiedResultsPage from "@/components/UnifiedResultsPage";
import { TermHint } from "@/components/TermHint";

// ─── Types ─────────────────────────────────────────────────────────────────────

type FollowUpQ = { question: string; options: string[]; hint?: string };
type Step = "rank" | "questions" | "close" | "results";

// All Q&A collected for a single topic
type TopicQA = {
  openerAnswerId: string;    // option id (for scoring); "other" for free-text
  openerAnswerText: string;  // display text (for conversation summary)
  followUps: { question: string; options: string[]; hint?: string; answer: string }[];
};

const BUCKET_LABELS: Record<number, string> = {
  4: "קריטי", 3: "חשוב מאוד", 2: "חשוב", 1: "פחות חשוב",
};

const OTHER_OPTION = "אחר — פרט";
const FOLLOW_UP_HARD_CAP = 4;

const LOADING_VERBS_FORMAL = ["שוקל...", "מנתח...", "מגבש...", "שוקל..."];
const LOADING_VERBS_PERSONAL = ["חושב...", "מקשיב...", "שוקל...", "מגבש...", "מעכל..."];

// ─── Scoring ──────────────────────────────────────────────────────────────────

function calcResults(
  buckets: Record<string, number>,
  topicQA: Record<string, TopicQA>,
  questionSet: Record<string, TopicQ>
) {
  const totals = new Array(PARTIES.length).fill(0);
  const maxPossible = new Array(PARTIES.length).fill(0);

  Object.entries(buckets).forEach(([topicId, weight]) => {
    if (weight === 0) return;
    const chosenId = topicQA[topicId]?.openerAnswerId;
    const option = questionSet[topicId]?.options.find((o) => o.id === chosenId);
    if (!option) return;
    option.scores.forEach((score, pi) => {
      totals[pi] += weight * (score + 2);
      maxPossible[pi] += weight * 4;
    });
  });

  return PARTIES.map((party, i) => ({
    ...party,
    score: maxPossible[i] > 0 ? Math.round((totals[i] / maxPossible[i]) * 100) : 50,
  })).sort((a, b) => b.score - a.score);
}

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

  // Cycling loading verb
  const [loadingVerbIdx, setLoadingVerbIdx] = useState(0);
  useEffect(() => {
    if (!loading) { setLoadingVerbIdx(0); return; }
    const verbs = tone === "personal" ? LOADING_VERBS_PERSONAL : LOADING_VERBS_FORMAL;
    const id = setInterval(() => {
      setLoadingVerbIdx((v) => (v + 1) % verbs.length);
    }, 1400);
    return () => clearInterval(id);
  }, [loading, tone]);

  const topicsToAsk = Object.entries(buckets)
    .filter(([, w]) => w >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // Restore "Other" input when navigating back to an already-answered opener
  useEffect(() => {
    if (step !== "questions" || currentFollowUp !== null) return;
    const tid = topicsToAsk[questionIndex];
    if (!tid) return;
    const qa = topicQA[tid];
    if (qa?.openerAnswerId === "other") {
      setShowOpenerInput(true);
      setOpenerDraft(qa.openerAnswerText ?? "");
    } else {
      setShowOpenerInput(false);
      setOpenerDraft("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, currentFollowUp, step]);

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
    askedCount: number
  ) => {
    const topic = TOPICS.find((t) => t.id === topicId)!;
    const nextTopicId = topicsToAsk[questionIndex + 1] ?? null;

    const res = await fetch("/api/follow-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationSoFar: buildConversationSoFar(questionIndex),
        currentTopic: {
          label: topic.label,
          openerQuestion: questionSet[topicId]?.question ?? "",
          openerAnswer: openerAnswerText,
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
      }),
    });

    return res.json() as Promise<{ prologue: string | null; followUp: FollowUpQ | null }>;
  };

  // ── Opener answer handler ───────────────────────────────────────────────────
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
      const data = await callFollowUpAPI(topicId, optionText, [], 0);
      if (data.followUp?.question) {
        setCurrentPrologue(data.prologue ?? null);
        setCurrentFollowUp(data.followUp);
        setFollowUpsAskedThisTopic(1);
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
        followUpsAskedThisTopic
      );
      if (data.followUp?.question) {
        setCurrentPrologue(data.prologue ?? null);
        setCurrentFollowUp(data.followUp);
        setFollowUpsAskedThisTopic((n) => n + 1);
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
        onBack={() => { window.location.href = "/"; }}
        onContinue={() => { setQuestionIndex(0); setStep("questions"); }}
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
          <button onClick={() => setStep("results")}
            className="w-full bg-teal-600 text-white py-4 rounded-xl font-semibold hover:bg-teal-700 transition-colors">
            ← לתוצאות
          </button>
        </div>
      </main>
    );
  }

  // ── Results step ─────────────────────────────────────────────────────────────
  if (step === "results") {
    return (
      <UnifiedResultsPage
        results={calcResults(buckets, topicQA, questionSet)}
        userAnswersSummary={buildAnswersSummary(buckets, topicQA, closeText, questionSet)}
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

  // ── Shared header ─────────────────────────────────────────────────────────────
  const Header = () => (
    <>
      <div className="flex justify-between items-center mb-8">
        <button onClick={goBack} className="text-sm text-gray-400 hover:text-gray-600">← חזרה</button>
        <span className="text-sm text-gray-400" dir="ltr">{questionIndex + 1} / {totalSteps}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>
    </>
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    const verbs = tone === "personal" ? LOADING_VERBS_PERSONAL : LOADING_VERBS_FORMAL;
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <Header />
          <p className="text-sm text-teal-500 animate-pulse text-center mt-16">{verbs[loadingVerbIdx]}</p>
        </div>
      </main>
    );
  }

  // ── Follow-up question ───────────────────────────────────────────────────────
  if (currentFollowUp) {
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <Header />

          <p className="text-xs font-medium text-teal-600 uppercase tracking-wider mb-4">{topic.label}</p>

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
              if (isOther) {
                return (
                  <div key={i}>
                    <button
                      onClick={() => { setShowFollowUpInput(true); setFollowUpDraft(""); }}
                      className={`w-full border-2 rounded-xl py-3 px-5 text-right text-sm transition-all ${
                        showFollowUpInput
                          ? "border-teal-400 bg-teal-50 text-teal-700"
                          : "border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {opt}
                    </button>
                    {showFollowUpInput && (
                      <div className="mt-2">
                        <textarea
                          autoFocus
                          data-hj-allow
                          value={followUpDraft}
                          onChange={(e) => setFollowUpDraft(e.target.value)}
                          placeholder="כתבו כאן..."
                          className="w-full border border-teal-300 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-teal-400"
                          dir="rtl"
                        />
                        <button
                          onClick={() => followUpDraft.trim() && handleFollowUpAnswer(followUpDraft.trim())}
                          disabled={!followUpDraft.trim()}
                          className="mt-2 w-full bg-teal-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors"
                        >
                          המשך ←
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <button key={i} onClick={() => handleFollowUpAnswer(opt)}
                  className="border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 rounded-xl py-4 px-5 text-right font-medium text-sm leading-snug transition-all">
                  {opt}
                </button>
              );
            })}
          </div>

          <button onClick={() => advanceToNextTopic(null)}
            className="w-full text-sm text-gray-500 border border-gray-200 rounded-lg px-4 py-2 hover:border-gray-300 hover:text-gray-600 transition-all text-center">
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
        <Header />

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
          {q.options.map((opt) => {
            const selected = topicQA[topicId]?.openerAnswerId === opt.id;
            return (
              <div key={opt.id}>
                <button
                  onClick={() => handleOpenerAnswer(opt.id, opt.text)}
                  className={`w-full border-2 rounded-xl py-4 px-5 text-right font-medium text-sm leading-snug transition-all ${
                    selected
                      ? "border-teal-500 bg-teal-50 text-teal-900"
                      : "border-gray-200 hover:border-teal-400 hover:bg-teal-50"
                  }`}>
                  {opt.text}
                </button>
                {opt.hint && (
                  <div className="mt-1.5 mr-3 border-r-2 border-teal-100 pr-2">
                    <TermHint definition={opt.hint} label={opt.term ? `מה זה "${opt.term}"?` : "מה זה אומר?"} />
                  </div>
                )}
              </div>
            );
          })}

          {/* "אחר — פרט" */}
          <div>
            <button
              onClick={() => { setShowOpenerInput(true); setOpenerDraft(topicQA[topicId]?.openerAnswerText ?? ""); }}
              className={`w-full border-2 rounded-xl py-3 px-5 text-right text-sm transition-all ${
                showOpenerInput || topicQA[topicId]?.openerAnswerId === "other"
                  ? "border-teal-400 bg-teal-50 text-teal-700"
                  : "border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"
              }`}
            >
              {OTHER_OPTION}
            </button>
            {showOpenerInput && (
              <div className="mt-2">
                <textarea
                  autoFocus
                  data-hj-allow
                  value={openerDraft}
                  onChange={(e) => setOpenerDraft(e.target.value)}
                  placeholder="כתבו כאן..."
                  className="w-full border border-teal-300 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  dir="rtl"
                />
                <button
                  onClick={() => openerDraft.trim() && handleOpenerAnswer("other", openerDraft.trim())}
                  disabled={!openerDraft.trim()}
                  className="mt-2 w-full bg-teal-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors"
                >
                  המשך ←
                </button>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => advanceToNextTopic(null)}
          className="w-full text-sm text-gray-500 border border-gray-200 rounded-lg px-4 py-2 hover:border-gray-300 hover:text-gray-600 transition-all text-center">
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
