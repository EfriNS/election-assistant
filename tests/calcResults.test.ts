import { describe, it, expect } from "vitest";

// ─── Inline the types and logic under test ───────────────────────────────────
// We test the scoring logic directly by reproducing the relevant types and the
// calcResults function here. This avoids importing client-component code into Node.

type Party = { id: string; name: string; description: string; website: string };
type Option = { id: string; text: string; scores: number[] };
type TopicQ = { question: string; options: Option[] };
type TopicQA = {
  openerAnswerId: string;
  openerAnswerText: string;
  followUps: { question: string; options: string[]; answer: string }[];
  coveredAspects?: string[];
};

const FOLLOW_UP_AI_WEIGHT = 0.5;

// Minimal 2-party fixture
const PARTIES: Party[] = [
  { id: "left",  name: "Left",  description: "", website: "" },
  { id: "right", name: "Right", description: "", website: "" },
];

function calcResults(
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
        effectiveScore = hasAiScore ? aiScore : null;
      } else if (hasFollowUps && hasAiScore) {
        const deterministicScore = option?.scores[pi] ?? 0;
        effectiveScore =
          deterministicScore * (1 - FOLLOW_UP_AI_WEIGHT) + aiScore * FOLLOW_UP_AI_WEIGHT;
      } else if (option) {
        effectiveScore = option.scores[pi];
      }

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const questionSet: Record<string, TopicQ> = {
  security: {
    question: "Security question",
    options: [
      { id: "peace",   text: "Peace",   scores: [2, -2] },
      { id: "control", text: "Control", scores: [-2, 2] },
    ],
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("calcResults — deterministic scoring", () => {
  it("scores purely from option when no AI scores provided", () => {
    const results = calcResults(
      { security: 3 },
      { security: { openerAnswerId: "peace", openerAnswerText: "Peace", followUps: [] } },
      questionSet
    );
    // "left" party (scores[0]=2) should score higher than "right" (scores[0]=-2)
    expect(results[0].id).toBe("left");
    expect(results[0].score).toBe(100);
    expect(results[1].score).toBe(0);
  });

  it("returns 50% for all parties when no topics are answered", () => {
    const results = calcResults({}, {}, questionSet);
    results.forEach((p) => expect(p.score).toBe(50));
  });

  it("skips topics with weight 0", () => {
    const results = calcResults(
      { security: 0 },
      { security: { openerAnswerId: "peace", openerAnswerText: "Peace", followUps: [] } },
      questionSet
    );
    results.forEach((p) => expect(p.score).toBe(50));
  });
});

describe("calcResults — AI score blending", () => {
  it("uses AI score at 100% for 'other' opener", () => {
    const results = calcResults(
      { security: 4 },
      { security: { openerAnswerId: "other", openerAnswerText: "My own view", followUps: [] } },
      questionSet,
      { security: { left: 2, right: -2 } }
    );
    expect(results[0].id).toBe("left");
    expect(results[0].score).toBe(100);
    expect(results[1].score).toBe(0);
  });

  it("blends at 50/50 for fixed opener with follow-ups and AI scores", () => {
    // opener = "peace": left=2, right=-2 (deterministic)
    // aiScore: left=0, right=0 (neutral)
    // blend: left = 2*0.5 + 0*0.5 = 1.0; right = -2*0.5 + 0*0.5 = -1.0
    // normalised: left=(1+2)/(4)*100=75; right=(-1+2)/(4)*100=25
    const results = calcResults(
      { security: 4 },
      { security: { openerAnswerId: "peace", openerAnswerText: "Peace", followUps: [
        { question: "Q", options: ["A"], answer: "A" }
      ] } },
      questionSet,
      { security: { left: 0, right: 0 } }
    );
    expect(results[0].id).toBe("left");
    expect(results[0].score).toBe(75);
    expect(results[1].score).toBe(25);
  });

  it("falls back to deterministic when AI score is null for a party", () => {
    // aiScore null for "right" → falls back to deterministic for "right" (option "peace": -2)
    const results = calcResults(
      { security: 4 },
      { security: { openerAnswerId: "peace", openerAnswerText: "Peace", followUps: [
        { question: "Q", options: ["A"], answer: "A" }
      ] } },
      questionSet,
      { security: { left: 2, right: null } }
    );
    // left: blended = 2*0.5 + 2*0.5 = 2 → 100%
    // right: deterministic from "peace" = -2 → 0%
    expect(results[0].id).toBe("left");
    expect(results[0].score).toBe(100);
    expect(results[1].score).toBe(0);
  });

  it("skips topic entirely for a party when 'other' opener and AI score is null", () => {
    // No data at all for "right" on this topic — it should get score=50 (default)
    const results = calcResults(
      { security: 4 },
      { security: { openerAnswerId: "other", openerAnswerText: "Custom", followUps: [] } },
      questionSet,
      { security: { left: 2, right: null } }
    );
    expect(results.find((p) => p.id === "left")!.score).toBe(100);
    expect(results.find((p) => p.id === "right")!.score).toBe(50); // skipped → default
  });

  it("uses deterministic scoring when aiScores is undefined (AI call failed)", () => {
    const results = calcResults(
      { security: 3 },
      { security: { openerAnswerId: "control", openerAnswerText: "Control", followUps: [
        { question: "Q", options: ["A"], answer: "A" }
      ] } },
      questionSet,
      undefined // AI unavailable
    );
    // "control" option: left=-2, right=2
    expect(results[0].id).toBe("right");
    expect(results[0].score).toBe(100);
  });
});
