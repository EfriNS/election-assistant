"use client";

import { Suspense, useState } from "react";
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

// ─── Score calculation (same formula as Prototype B) ──────────────────────────

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
  openerAnswers: Record<string, string>,
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
      const option = questionSet[t.id]?.options.find((o) => o.id === openerAnswers[t.id]);
      const openerText = option ? option.text : "לא ענה";
      let result = `${t.label} (${BUCKET_LABELS[weight]}): ${openerText}`;

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

// ─── Inner component (needs useSearchParams) ──────────────────────────────────

function PrototypeEInner() {
  const searchParams = useSearchParams();
  const tone = searchParams.get("tone") ?? "formal";
  const depth = searchParams.get("depth") ?? "short";
  const questionSet = tone === "personal" ? QUESTIONS_PERSONAL : QUESTIONS_FORMAL;
  const followUpCount = depth === "deep" ? 2 : 1;

  const [step, setStep] = useState<Step>("rank");
  const [buckets, setBuckets] = useState<Record<string, number>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [topicPhase, setTopicPhase] = useState<"opener" | "followup">("opener");
  const [followUpIdx, setFollowUpIdx] = useState(0);
  const [openerAnswers, setOpenerAnswers] = useState<Record<string, string>>({});
  const [followUps, setFollowUps] = useState<Record<string, FollowUpQ[]>>({});
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string[]>>({});
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [closeText, setCloseText] = useState("");

  // Topics sorted by bucket weight (highest first), only those assigned
  const topicsToAsk = Object.entries(buckets)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

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
            onClick={() => { setStep("questions"); setQuestionIndex(topicsToAsk.length - 1); }}
            className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block"
          >
            ← חזרה
          </button>
          <h2 className="text-xl font-bold mb-3">משהו שרצית להוסיף?</h2>
          <p className="text-sm text-gray-500 mb-6">
            אם יש עמדה חשובה שלא עלתה, אפשר לכתוב כאן — זה יעזור לקבל המלצה מדויקת יותר.
          </p>
          <textarea
            value={closeText}
            onChange={(e) => setCloseText(e.target.value)}
            placeholder="כאן תוכל לכתוב בחופשיות..."
            className="w-full border border-gray-300 rounded-xl p-4 text-sm leading-relaxed h-36 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 mb-4"
            dir="rtl"
          />
          <button
            onClick={() => setStep("results")}
            className="w-full bg-teal-600 text-white py-4 rounded-xl font-semibold hover:bg-teal-700 transition-colors mb-3"
          >
            לתוצאות →
          </button>
          <button
            onClick={() => setStep("results")}
            className="w-full text-sm text-gray-400 hover:text-gray-600 text-center py-2"
          >
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
          buckets, openerAnswers, followUps, followUpAnswers, closeText, questionSet
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

  const goBack = () => {
    if (topicPhase === "followup") {
      if (followUpIdx > 0) {
        setFollowUpIdx((i) => i - 1);
      } else {
        setTopicPhase("opener");
        setFollowUpIdx(0);
      }
    } else {
      if (questionIndex === 0) {
        setStep("rank");
      } else {
        setQuestionIndex((i) => i - 1);
        setTopicPhase("opener");
        setFollowUpIdx(0);
      }
    }
  };

  const advanceToNextTopic = () => {
    if (questionIndex + 1 < topicsToAsk.length) {
      setQuestionIndex((i) => i + 1);
      setTopicPhase("opener");
      setFollowUpIdx(0);
    } else {
      setStep("close");
    }
  };

  const handleOpenerAnswer = async (optionId: string) => {
    setOpenerAnswers((prev) => ({ ...prev, [topicId]: optionId }));

    if (followUpCount < 1) {
      advanceToNextTopic();
      return;
    }

    setTopicPhase("followup");
    setFollowUpIdx(0);
    setFollowUpLoading(true);

    const option = q.options.find((o) => o.id === optionId);
    try {
      const res = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicId,
          openerQuestion: q.question,
          openerAnswer: option?.text ?? optionId,
          tone,
          count: followUpCount,
        }),
      });
      const data = await res.json();
      if (data.followUps && data.followUps.length > 0) {
        setFollowUps((prev) => ({ ...prev, [topicId]: data.followUps }));
      } else {
        advanceToNextTopic();
      }
    } catch {
      advanceToNextTopic();
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleFollowUpAnswer = (answerText: string) => {
    setFollowUpAnswers((prev) => {
      const existing = prev[topicId] ?? [];
      const updated = [...existing];
      updated[followUpIdx] = answerText;
      return { ...prev, [topicId]: updated };
    });

    const topicFollowUps = followUps[topicId] ?? [];
    if (followUpIdx + 1 < topicFollowUps.length && followUpIdx + 1 < followUpCount) {
      setFollowUpIdx((i) => i + 1);
    } else {
      advanceToNextTopic();
    }
  };

  const handleSkip = () => {
    advanceToNextTopic();
  };

  // ── Loading state (waiting for follow-up API) ───────────────────────────────
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
          <p className="text-sm text-teal-500 animate-pulse text-center mt-16">מכין שאלת המשך...</p>
        </div>
      </main>
    );
  }

  // ── Follow-up question ──────────────────────────────────────────────────────
  if (topicPhase === "followup") {
    const currentFollowUp = (followUps[topicId] ?? [])[followUpIdx];
    if (!currentFollowUp) {
      advanceToNextTopic();
      return null;
    }

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

          <div className="flex flex-col gap-3 mb-6">
            {currentFollowUp.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleFollowUpAnswer(opt)}
                className="border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 rounded-xl py-4 px-5 text-right font-medium text-sm leading-snug transition-all"
              >
                {opt}
              </button>
            ))}
          </div>

          <button onClick={handleSkip} className="w-full text-sm text-gray-500 border border-gray-200 rounded-lg px-4 py-2 hover:border-gray-300 hover:text-gray-600 transition-all text-center">
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

        <div className="flex items-center gap-2 mb-1">
          {bucketLabel && (
            <span className="text-xs text-white bg-teal-600 rounded-full px-2 py-0.5 shrink-0">
              {bucketLabel}
            </span>
          )}
          <p className="text-xs font-medium text-teal-700 uppercase tracking-wider">{topic.label}</p>
        </div>
        <h2 className="text-xl font-bold leading-snug mb-8">{q.question}</h2>

        <div className="flex flex-col gap-3 mb-6">
          {q.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleOpenerAnswer(opt.id)}
              className="border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 rounded-xl py-4 px-5 text-right font-medium text-sm leading-snug transition-all"
            >
              {opt.text}
            </button>
          ))}
        </div>

        <button onClick={handleSkip} className="w-full text-sm text-gray-500 border border-gray-200 rounded-lg px-4 py-2 hover:border-gray-300 hover:text-gray-600 transition-all text-center">
          דלג על שאלה זו
        </button>
      </div>
    </main>
  );
}

// ─── Page wrapper (Suspense required for useSearchParams in App Router) ────────

export default function PrototypeE() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">טוען...</div>}>
      <PrototypeEInner />
    </Suspense>
  );
}

export { MIN_IMPORTANT };
