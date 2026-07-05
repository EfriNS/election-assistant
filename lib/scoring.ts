import { PARTIES } from "@/lib/parties";
import { CRITICAL_WEIGHT } from "@/lib/topics";

export type TopicQA = {
  openerAnswerId: string;
  openerAnswerText: string;
  followUps: { question: string; options: string[]; hint?: string; answer: string }[];
  coveredAspects?: string[];
  freeTextInterpretation?: string;
};

import type { TopicQ } from "@/lib/questions";

// Weight given to AI-derived score when blending with deterministic option score.
// Topics with "other" free-text opener use AI at full weight (no option score exists).
export const FOLLOW_UP_AI_WEIGHT = 0.5;

// Non-linear exponent applied to each topic's normalized contribution (0–1) before
// weighting. n=1 → linear; n=1.5 → mismatches hurt proportionally more than
// agreements help (e.g., a 35% topic score becomes ~21%, while 88% → ~82%).
export const SCORE_CURVE_POWER = 1.5;

// A party opposed to the user's stance on a topic marked קריטי (CRITICAL_WEIGHT)
// has its overall score capped here, regardless of how well it does elsewhere —
// score and rank always tell the same story, there's no separate rank-only rule.
// Reuses the same cutpoint as PartyResultCard's "✕" topic-chip convention (pct<40).
export const GATE_SCORE_CAP = 40;
const GATE_CONFLICT_THRESHOLD = -0.4; // raw -2..+2 scale; (x+2)/4 < 0.4 ⇔ x < -0.4

export type CalcResultsReturn = {
  ranked: Array<typeof PARTIES[number] & { score: number; rawScore: number; criticalConflicts: string[] }>;
  topicScores: Record<string, Record<string, number>>; // partyId → topicId → 0–100
};

export function calcResults(
  buckets: Record<string, number>,
  topicQA: Record<string, TopicQA>,
  questionSet: Record<string, TopicQ>,
  aiScores?: Record<string, Record<string, number | null>>
): CalcResultsReturn {
  const totals = new Array(PARTIES.length).fill(0);
  const maxPossible = new Array(PARTIES.length).fill(0);
  const topicScores: Record<string, Record<string, number>> = {};
  const criticalConflicts: Record<string, string[]> = {}; // partyId → topicIds gated on

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

      // Gate signal — deliberately distinct from effectiveScore's 50/50 blend:
      // prefer the grounding-backed AI score outright when one exists, falling
      // back to the opener's estimate only when there's no AI score at all.
      const gateScore = hasAiScore ? aiScore : (option ? option.scores[pi] : null);
      if (weight === CRITICAL_WEIGHT && gateScore !== null && gateScore < GATE_CONFLICT_THRESHOLD) {
        (criticalConflicts[party.id] ??= []).push(topicId);
      }

      if (effectiveScore !== null) {
        const normalized = (effectiveScore + 2) / 4;  // 0–1
        totals[pi] += weight * Math.pow(normalized, SCORE_CURVE_POWER);
        maxPossible[pi] += weight;  // max curved contribution is weight × 1^n = weight
        if (!topicScores[party.id]) topicScores[party.id] = {};
        topicScores[party.id][topicId] = Math.round(normalized * 100);  // raw, pre-curve
      }
    });
  });

  const ranked = PARTIES.map((party, i) => {
    const rawScore = maxPossible[i] > 0 ? Math.round((totals[i] / maxPossible[i]) * 100) : 50;
    const conflicts = criticalConflicts[party.id] ?? [];
    const score = conflicts.length > 0 ? Math.min(rawScore, GATE_SCORE_CAP) : rawScore;
    return { ...party, score, rawScore, criticalConflicts: conflicts };
  }).sort((a, b) => b.score - a.score || b.rawScore - a.rawScore);

  return { ranked, topicScores };
}
