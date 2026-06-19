"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PARTIES } from "@/lib/parties";
import { QUESTIONS_FORMAL, QUESTIONS_PERSONAL, TopicQ } from "@/lib/questions";
import PrioritiesStep, { TOPICS, MIN_IMPORTANT } from "@/components/PrioritiesStep";
import UnifiedResultsPage from "@/components/UnifiedResultsPage";

// ─── Types ─────────────────────────────────────────────────────────────────────

type FollowUpQ = { question: string; options: string[] };
type Step = "rank" | "questions" | "close" | "results";

const BUCKET_LABELS: Record<number, string> = {
  4: "קריטי", 3: "חשוב מאוד", 2: "חשוב", 1: "פחות חשוב",
};

const OTHER_OPTION = "אחר — פרט";

// ─── Scoring (same formula as Prototype B) ────────────────────────────────────

function calcResults(
  buckets: Record<string, number>,
  openerAnswers: Record<string, string>,
  questionSet: Record<string, TopicQ>
) {
  const totals = new Array(PARTIES.length).fill(0);
  const maxPossible = new Array(PARTIES.length).fill(0);

  Object.entries(buckets).forEach(([topicId, weight]) => {
    if (weight === 0) return;
    const chosenId = openerAnswers[topicId];
    const option = questionSet[topicId]?.options.find((o) => o.id === chosenId);
    if (!option) return; // "other" or skipped — no score contribution
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
  openerAnswers: Record<string, string>,
  openerTexts: Record<string, string>,
  followUps: Record<string, FollowUpQ[]>,
  followUpAnswers: Record<string, string[]>,
  closeText: string,
  questionSet: Record<string, TopicQ>
): string {
  const lines = TOPICS
    .filter((t) => (buckets[t.id] ?? 0) > 0)
    .sort((a, b) => (buckets[b.id] ?? 0) - (buckets[a.id] ?? 0))
    .map((t) => {
      const weight = buckets[t.id];
      const answerText = openerTexts[t.id]
        ?? questionSet[t.id]?.options.find((o) => o.id === openerAnswers[t.id])?.text
        ?? "לא ענה";
      let result = `${t.label} (${BUCKET_LABELS[weight]}): ${answerText}`;

      const fqs = followUps[t.id] ?? [];
      const fas = followUpAnswers[t.id] ?? [];
      fqs.forEach((fq, i) => {
        if (fas[i]) result += `\n  → ${fq.question}: ${fas[i]}`;
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
  const maxFollowUps = depth === "deep" ? 2 : 1;

  const [step, setStep] = useState<Step>("rank");
  const [buckets, setBuckets] = useState<Record<string, number>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [topicPhase, setTopicPhase] = useState<"opener" | "followup">("opener");
  const [followUpIdx, setFollowUpIdx] = useState(0);

  // Opener answers: option ID (for scoring) + free text (for conversation)
  const [openerAnswers, setOpenerAnswers] = useState<Record<string, string>>({});
  const [openerTexts, setOpenerTexts] = useState<Record<string, string>>({});

  // "אחר — פרט" input state
  const [showOpenerInput, setShowOpenerInput] = useState(false);
  const [openerDraft, setOpenerDraft] = useState("");
  const [showFollowUpInput, setShowFollowUpInput] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState("");

  // Follow-up state
  const [followUps, setFollowUps] = useState<Record<string, FollowUpQ[]>>({});
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string[]>>({});
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Prologues: topicId → AI-generated bridge sentence
  const [prologues, setPrologues] = useState<Record<string, string>>({});

  const [closeText, setCloseText] = useState("");

  const topicsToAsk = Object.entries(buckets)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // Restore "Other" input state when navigating back to an already-answered opener
  useEffect(() => {
    if (step !== "questions" || topicPhase !== "opener") return;
    const tid = topicsToAsk[questionIndex];
    if (!tid) return;
    if (openerAnswers[tid] === "other") {
      setShowOpenerInput(true);
      setOpenerDraft(openerTexts[tid] ?? "");
    } else {
      setShowOpenerInput(false);
      setOpenerDraft("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, topicPhase, step]);

  // ── Build conversation history for API ──────────────────────────────────────
  const buildConversationSoFar = (upToIndex: number) =>
    topicsToAsk.slice(0, upToIndex).map((tid) => {
      const topic = TOPICS.find((t) => t.id === tid)!;
      const answerText =
        openerTexts[tid] ??
        questionSet[tid]?.options.find((o) => o.id === openerAnswers[tid])?.text ??
        "";
      const fqs = followUps[tid] ?? [];
      const fas = followUpAnswers[tid] ?? [];
      return {
        topicLabel: topic.label,
        openerQuestion: questionSet[tid]?.question ?? "",
        openerAnswer: answerText,
        followUpQA: fqs.slice(0, fas.length).map((fq, i) => ({
          question: fq.question,
          answer: fas[i] ?? "",
        })),
      };
    });

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const advanceToNextTopic = () => {
    const next = questionIndex + 1;
    if (next < topicsToAsk.length) {
      setQuestionIndex(next);
      setTopicPhase("opener");
      setFollowUpIdx(0);
      setShowOpenerInput(false);
      setOpenerDraft("");
      setShowFollowUpInput(false);
      setFollowUpDraft("");
    } else {
      setStep("close");
    }
  };

  const goBack = () => {
    setShowOpenerInput(false);
    setOpenerDraft("");
    setShowFollowUpInput(false);
    setFollowUpDraft("");

    if (topicPhase === "followup") {
      if (followUpIdx > 0) {
        setFollowUpIdx((i) => i - 1);
      } else {
        setTopicPhase("opener");
      }
    } else {
      if (questionIndex === 0) setStep("rank");
      else { setQuestionIndex((i) => i - 1); setTopicPhase("opener"); setFollowUpIdx(0); }
    }
  };

  // ── Opener answer handler ───────────────────────────────────────────────────
  const handleOpenerAnswer = async (optionId: string, optionText: string) => {
    setOpenerAnswers((prev) => ({ ...prev, [topicsToAsk[questionIndex]]: optionId }));
    setOpenerTexts((prev) => ({ ...prev, [topicsToAsk[questionIndex]]: optionText }));
    setShowOpenerInput(false);
    setOpenerDraft("");

    const topicId = topicsToAsk[questionIndex];
    const topic = TOPICS.find((t) => t.id === topicId)!;
    const nextTopicId = topicsToAsk[questionIndex + 1] ?? null;
    const nextTopicLabel = nextTopicId
      ? TOPICS.find((t) => t.id === nextTopicId)?.label ?? nextTopicId
      : null;

    setTopicPhase("followup");
    setFollowUpIdx(0);
    setFollowUpLoading(true);

    try {
      const res = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationSoFar: buildConversationSoFar(questionIndex),
          currentTopic: {
            label: topic.label,
            openerQuestion: questionSet[topicId]?.question ?? "",
            openerAnswer: optionText,
          },
          nextTopic: nextTopicId
            ? { id: nextTopicId, label: nextTopicLabel }
            : null,
          tone,
          maxFollowUps,
        }),
      });

      const data = await res.json();

      if (data.nextPrologue && nextTopicId) {
        setPrologues((prev) => ({ ...prev, [nextTopicId]: data.nextPrologue }));
      }
      if (data.followUp?.question) {
        setFollowUps((prev) => ({ ...prev, [topicId]: [data.followUp] }));
      } else {
        advanceToNextTopic();
      }
    } catch {
      advanceToNextTopic();
    } finally {
      setFollowUpLoading(false);
    }
  };

  // ── Follow-up answer handler ────────────────────────────────────────────────
  const handleFollowUpAnswer = (answerText: string) => {
    const topicId = topicsToAsk[questionIndex];
    setFollowUpAnswers((prev) => {
      const existing = [...(prev[topicId] ?? [])];
      existing[followUpIdx] = answerText;
      return { ...prev, [topicId]: existing };
    });
    setShowFollowUpInput(false);
    setFollowUpDraft("");

    const topicFollowUps = followUps[topicId] ?? [];
    if (followUpIdx + 1 < topicFollowUps.length) {
      setFollowUpIdx((i) => i + 1);
    } else {
      advanceToNextTopic();
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
          <button onClick={() => { setStep("questions"); setQuestionIndex(topicsToAsk.length - 1); }}
            className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← חזרה</button>
          <h2 className="text-xl font-bold mb-3">משהו שרצית להוסיף?</h2>
          <p className="text-sm text-gray-500 mb-6">
            אם יש עמדה חשובה שלא עלתה, אפשר לכתוב כאן — זה יעזור לקבל המלצה מדויקת יותר.
          </p>
          <textarea value={closeText} onChange={(e) => setCloseText(e.target.value)}
            placeholder="כאן תוכל לכתוב בחופשיות..."
            className="w-full border border-gray-300 rounded-xl p-4 text-sm leading-relaxed h-36 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 mb-4"
            dir="rtl" />
          <button onClick={() => setStep("results")}
            className="w-full bg-teal-600 text-white py-4 rounded-xl font-semibold hover:bg-teal-700 transition-colors mb-3">
            לתוצאות →
          </button>
          <button onClick={() => setStep("results")}
            className="w-full text-sm text-gray-400 hover:text-gray-600 text-center py-2">
            דלג — עבור לתוצאות
          </button>
        </div>
      </main>
    );
  }

  // ── Results step ─────────────────────────────────────────────────────────────
  if (step === "results") {
    return (
      <UnifiedResultsPage
        results={calcResults(buckets, openerAnswers, questionSet)}
        userAnswersSummary={buildAnswersSummary(
          buckets, openerAnswers, openerTexts, followUps, followUpAnswers, closeText, questionSet
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
  const progressPct = ((questionIndex + (topicPhase === "followup" ? 0.5 : 0)) / totalSteps) * 100;
  const prologue = topicPhase === "opener" ? prologues[topicId] : null;

  // ── Loading (waiting for follow-up API) ─────────────────────────────────────
  if (topicPhase === "followup" && followUpLoading) {
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="flex justify-between items-center mb-8">
            <button onClick={goBack} className="text-sm text-gray-400 hover:text-gray-600">← חזרה</button>
            <span className="text-sm text-gray-400" dir="ltr">{questionIndex + 1} / {totalSteps}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-sm text-teal-500 animate-pulse text-center mt-16">רגע...</p>
        </div>
      </main>
    );
  }

  // ── Follow-up question ──────────────────────────────────────────────────────
  if (topicPhase === "followup") {
    const currentFollowUp = (followUps[topicId] ?? [])[followUpIdx];
    if (!currentFollowUp) { advanceToNextTopic(); return null; }

    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="flex justify-between items-center mb-8">
            <button onClick={goBack} className="text-sm text-gray-400 hover:text-gray-600">← חזרה</button>
            <span className="text-sm text-gray-400" dir="ltr">{questionIndex + 1} / {totalSteps}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          <p className="text-xs font-medium text-teal-600 uppercase tracking-wider mb-4">{topic.label}</p>
          <h2 className="text-xl font-bold leading-snug mb-8">{currentFollowUp.question}</h2>

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

          <button onClick={advanceToNextTopic}
            className="w-full text-sm text-gray-500 border border-gray-200 rounded-lg px-4 py-2 hover:border-gray-300 hover:text-gray-600 transition-all text-center">
            דלג על שאלה זו
          </button>
        </div>
      </main>
    );
  }

  // ── Opener question ─────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="flex justify-between items-center mb-8">
          <button onClick={goBack} className="text-sm text-gray-400 hover:text-gray-600">← חזרה</button>
          <span className="text-sm text-gray-400" dir="ltr">{questionIndex + 1} / {totalSteps}</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>

        {/* AI prologue — transition from previous topic */}
        {prologue && (
          <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-8">
            <span className="text-indigo-300 text-xs mt-0.5 shrink-0">✦</span>
            <p className="text-sm text-indigo-800 leading-relaxed">{prologue}</p>
          </div>
        )}

        <div className="flex items-center gap-2 mb-1">
          {bucketLabel && (
            <span className="text-xs text-white bg-teal-600 rounded-full px-2 py-0.5 shrink-0">
              {bucketLabel}
            </span>
          )}
          <p className="text-xs font-medium text-teal-700 uppercase tracking-wider">{topic.label}</p>
        </div>
        <h2 className="text-xl font-bold leading-snug mb-8">{q.question}</h2>

        <div className="flex flex-col gap-3 mb-4">
          {q.options.map((opt) => {
            const selected = openerAnswers[topicId] === opt.id;
            return (
              <button key={opt.id}
                onClick={() => handleOpenerAnswer(opt.id, opt.text)}
                className={`border-2 rounded-xl py-4 px-5 text-right font-medium text-sm leading-snug transition-all ${
                  selected
                    ? "border-teal-500 bg-teal-50 text-teal-900"
                    : "border-gray-200 hover:border-teal-400 hover:bg-teal-50"
                }`}>
                {opt.text}
              </button>
            );
          })}

          {/* "אחר — פרט" */}
          <div>
            <button
              onClick={() => { setShowOpenerInput(true); setOpenerDraft(openerTexts[topicId] ?? ""); }}
              className={`w-full border-2 rounded-xl py-3 px-5 text-right text-sm transition-all ${
                showOpenerInput || openerAnswers[topicId] === "other"
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

        <button onClick={advanceToNextTopic}
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
