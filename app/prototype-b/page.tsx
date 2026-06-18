"use client";

import { useState } from "react";
import { PARTIES } from "@/lib/parties";
import { QUESTIONS_PERSONAL } from "@/lib/questions";
import PrioritiesStep, { TOPICS, MIN_IMPORTANT } from "@/components/PrioritiesStep";
import UnifiedResultsPage from "@/components/UnifiedResultsPage";

// ─── Answer summary for AI ────────────────────────────────────────────────────

const BUCKET_LABELS: Record<number, string> = {
  4: "קריטי", 3: "חשוב מאוד", 2: "חשוב", 1: "פחות חשוב",
};

function buildAnswersSummary(buckets: Record<string, number>, answers: Record<string, string>): string {
  return TOPICS
    .filter((t) => (buckets[t.id] ?? 0) > 0)
    .sort((a, b) => (buckets[b.id] ?? 0) - (buckets[a.id] ?? 0))
    .map((t) => {
      const weight = buckets[t.id];
      const option = QUESTIONS_PERSONAL[t.id]?.options.find((o) => o.id === answers[t.id]);
      const answerText = option ? option.text : "לא ענה";
      return `${t.label} (${BUCKET_LABELS[weight]}): ${answerText}`;
    })
    .join("\n");
}

// ─── Party matching ────────────────────────────────────────────────────────────

function calcResults(buckets: Record<string, number>, answers: Record<string, string>) {
  const totals = new Array(PARTIES.length).fill(0);
  const maxPossible = new Array(PARTIES.length).fill(0);

  Object.entries(buckets).forEach(([topicId, weight]) => {
    if (weight === 0) return;
    const chosenId = answers[topicId];
    const option = QUESTIONS_PERSONAL[topicId]?.options.find((o) => o.id === chosenId);
    if (!option) return;
    option.scores.forEach((score, pi) => {
      totals[pi] += weight * (score + 2); // normalize -2..+2 → 0..4
      maxPossible[pi] += weight * 4;
    });
  });

  return PARTIES.map((party, i) => ({
    ...party,
    score: maxPossible[i] > 0 ? Math.round((totals[i] / maxPossible[i]) * 100) : 50,
  })).sort((a, b) => b.score - a.score);
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = "rank" | "questions" | "results";

export default function PrototypeB() {
  const [step, setStep] = useState<Step>("rank");
  const [buckets, setBuckets] = useState<Record<string, number>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Topics with importance > 0, sorted highest bucket first
  const topicsToAsk = Object.entries(buckets)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // ── Bucket assignment phase ────────────────────────────────────────────────
  if (step === "rank") {
    return (
      <PrioritiesStep
        buckets={buckets}
        setBuckets={setBuckets}
        accentColor="emerald"
        onBack={() => { window.location.href = "/"; }}
        onContinue={() => { setQuestionIndex(0); setStep("questions"); }}
      />
    );
  }

  // ── Question phase ─────────────────────────────────────────────────────────
  if (step === "questions") {
    const topicId = topicsToAsk[questionIndex];
    const topic = TOPICS.find((t) => t.id === topicId)!;
    const q = QUESTIONS_PERSONAL[topicId];
    const BUCKETS_LABELS: Record<number, string> = { 4: "קריטי", 3: "חשוב מאוד", 2: "חשוב", 1: "פחות חשוב" };
    const bucketLabel = BUCKETS_LABELS[buckets[topicId] ?? 0];

    const handleAnswer = (optionId: string) => {
      const next = { ...answers, [topicId]: optionId };
      setAnswers(next);
      if (questionIndex + 1 < topicsToAsk.length) {
        setQuestionIndex(questionIndex + 1);
      } else {
        setStep("results");
      }
    };

    const handleSkip = () => {
      if (questionIndex + 1 < topicsToAsk.length) {
        setQuestionIndex(questionIndex + 1);
      } else {
        setStep("results");
      }
    };

    const handleBack = () => {
      if (questionIndex === 0) {
        setStep("rank");
      } else {
        setQuestionIndex(questionIndex - 1);
      }
    };

    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="flex justify-between items-center mb-8">
            <button onClick={handleBack} className="text-sm text-gray-400 hover:text-gray-600">← חזרה</button>
            <span className="text-sm text-gray-400" dir="ltr">{questionIndex + 1} / {topicsToAsk.length}</span>
          </div>

          <div className="h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(questionIndex / topicsToAsk.length) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-2 mb-1">
            {bucketLabel && (
              <span className="text-xs text-white bg-emerald-600 rounded-full px-2 py-0.5 shrink-0">
                {bucketLabel}
              </span>
            )}
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">{topic.label}</p>
          </div>
          <h2 className="text-xl font-bold leading-snug mb-8">{q.question}</h2>

          <div className="flex flex-col gap-3 mb-6">
            {q.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleAnswer(opt.id)}
                className="border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-xl py-4 px-5 text-right font-medium text-sm leading-snug transition-all"
              >
                {opt.text}
              </button>
            ))}
          </div>

          <button onClick={handleSkip} className="w-full text-sm text-gray-400 hover:text-gray-600 text-center py-2">
            דלג על שאלה זו
          </button>
        </div>
      </main>
    );
  }

  // ── Results phase ──────────────────────────────────────────────────────────
  return (
    <UnifiedResultsPage
      results={calcResults(buckets, answers)}
      userAnswersSummary={buildAnswersSummary(buckets, answers)}
      accentColor="emerald"
      onBack={() => { setQuestionIndex(topicsToAsk.length - 1); setStep("questions"); }}
    />
  );
}

export { MIN_IMPORTANT };
