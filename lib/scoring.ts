import { PARTIES } from "@/lib/parties";

export type TopicQA = {
  openerAnswerId: string;
  openerAnswerText: string;
  followUps: { question: string; options: string[]; hint?: string; answer: string }[];
  coveredAspects?: string[];
};

import type { TopicQ } from "@/lib/questions";

// Weight given to AI-derived score when blending with deterministic option score.
// Topics with "other" free-text opener use AI at full weight (no option score exists).
export const FOLLOW_UP_AI_WEIGHT = 0.5;

export function calcResults(
  buckets: Record<string, number>,
  topicQA: Record<string, TopicQA>,
  questionSet: Record<string, TopicQ>,
  aiScores?: Record<string, Record<string, number | null>>
) {
  const totals = new Array(PARTIES.length).fill(0);
  const maxPossible = new Array(PARTIES.length).fill(0);

  Object.entries(buckets).forEach(([topicId, weight]) => {
    if (weight === 0) return;
    const qa = topicQA[topicId];
    const chosenId = qa?.openerAnswerId;
    const option = questionSet[topicId]?.options.find((o) => o.id === chosenId);
    const isOtherOpener = chosenId === "other";
    const hasFollowUps = (qa?.followUps?.length ?? 0) > 0;

    PARTIES.forEach((party, pi) => {
      const aiScore = aiScores?.[topicId]?.[party.id];
      const hasAiScore = typeof aiScore === "number";

      let effectiveScore: number | null = null;

      if (isOtherOpener) {
        // No option score exists; AI comparison against platform text is the only signal
        effectiveScore = hasAiScore ? aiScore : null;
      } else if (hasFollowUps && hasAiScore) {
        // Blend: opener option score + AI score derived from follow-up answers
        const deterministicScore = option?.scores[pi] ?? 0;
        effectiveScore =
          deterministicScore * (1 - FOLLOW_UP_AI_WEIGHT) + aiScore * FOLLOW_UP_AI_WEIGHT;
      } else if (option) {
        // Pure deterministic: fixed-option opener, no follow-ups or AI unavailable
        effectiveScore = option.scores[pi];
      }
      // null effectiveScore: no data for this party on this topic — skip entirely

      if (effectiveScore !== null) {
        totals[pi] += weight * (effectiveScore + 2);
        maxPossible[pi] += weight * 4;
      }
    });
  });

  return PARTIES.map((party, i) => ({
    ...party,
    score: maxPossible[i] > 0 ? Math.round((totals[i] / maxPossible[i]) * 100) : 50,
  })).sort((a, b) => b.score - a.score);
}
