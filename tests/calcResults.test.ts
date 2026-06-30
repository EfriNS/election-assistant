import { describe, it, expect } from "vitest";
import { calcResults, FOLLOW_UP_AI_WEIGHT, SCORE_CURVE_POWER } from "@/lib/scoring";
import { PARTIES } from "@/lib/parties";
import type { TopicQA } from "@/lib/scoring";
import type { TopicQ } from "@/lib/questions";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// Two-option question: "peace" favours left, "control" favours right.
const questionSet: Record<string, TopicQ> = {
  security: {
    question: "Security question",
    options: [
      { id: "peace",   text: "Peace",   scores: [2, -2, -2, -2, -2, -2, -2, -2, -2, -2] },
      { id: "control", text: "Control", scores: [-2, -2, -2, -2, -2, -2, -2, -2, -2, 2] },
    ],
  },
  economy: {
    question: "Economy question",
    options: [
      { id: "left-econ",  text: "Left econ",  scores: [2, -2, -2, -2, -2, -2, -2, -2, -2, -2] },
      { id: "right-econ", text: "Right econ", scores: [-2, -2, -2, -2, -2, -2, -2, -2, -2, 2] },
    ],
  },
};

// Neutral question: all parties score 0 — useful for testing ties and the score curve.
const questionSetNeutral: Record<string, TopicQ> = {
  security: {
    question: "Security question",
    options: [
      { id: "neutral", text: "Neutral", scores: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ],
  },
};

// Helper: minimal TopicQA with a fixed-option opener and no follow-ups
function qa(openerAnswerId: string, openerAnswerText = openerAnswerId, followUps: TopicQA["followUps"] = []): TopicQA {
  return { openerAnswerId, openerAnswerText, followUps };
}

// The actual PARTIES list has 10 entries (hadash … otzmah-yehudit).
// We reference only index 0 (hadash) and 9 (otzmah-yehudit) for assertions.
// "peace" option has scores[0]=2, scores[9]=-2; "control" is the reverse.

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("calcResults — deterministic scoring", () => {
  it("scores purely from option when no AI scores provided", () => {
    const { ranked: results } = calcResults({ security: 3 }, { security: qa("peace") }, questionSet);
    const hadash = results.find((p) => p.id === "hadash")!;
    const otzmah = results.find((p) => p.id === "otzmah-yehudit")!;
    expect(hadash.score).toBe(100);
    expect(otzmah.score).toBe(0);
    expect(results[0].id).toBe("hadash"); // highest score first
  });

  it("returns 50 for all parties when no topics are answered", () => {
    const { ranked: results } = calcResults({}, {}, questionSet);
    results.forEach((p) => expect(p.score).toBe(50));
  });

  it("skips topics with weight 0", () => {
    const { ranked: results } = calcResults({ security: 0 }, { security: qa("peace") }, questionSet);
    results.forEach((p) => expect(p.score).toBe(50));
  });

  it("accumulates correctly across multiple topics with different weights", () => {
    // security (weight 4): peace → hadash +2 each
    // economy (weight 2): left-econ → hadash +2 each
    // hadash total = 4*(2+2) + 2*(2+2) = 24, max = 4*4 + 2*4 = 24 → 100%
    // otzmah total = 4*(-2+2) + 2*(-2+2) = 0 → 0%
    const { ranked: results } = calcResults(
      { security: 4, economy: 2 },
      { security: qa("peace"), economy: qa("left-econ") },
      questionSet
    );
    const hadash = results.find((p) => p.id === "hadash")!;
    const otzmah = results.find((p) => p.id === "otzmah-yehudit")!;
    expect(hadash.score).toBe(100);
    expect(otzmah.score).toBe(0);
  });

  it("produces stable output — same input always gives same ranking", () => {
    const input = { security: 3 };
    const { ranked: r1 } = calcResults(input, { security: qa("peace") }, questionSet);
    const { ranked: r2 } = calcResults(input, { security: qa("peace") }, questionSet);
    expect(r1.map((p) => p.id)).toEqual(r2.map((p) => p.id));
    expect(r1.map((p) => p.score)).toEqual(r2.map((p) => p.score));
  });
});

describe("calcResults — AI score blending", () => {
  it("uses AI score at 100% weight for 'other' (free-text) opener", () => {
    const { ranked: results } = calcResults(
      { security: 4 },
      { security: qa("other", "My custom view") },
      questionSet,
      { security: { hadash: 2, "otzmah-yehudit": -2, ...Object.fromEntries(["raam","democrats","beyahad","yashar","beitenu","likud","shas","yahadut-hatorah"].map(id => [id, 0])) } }
    );
    expect(results.find((p) => p.id === "hadash")!.score).toBe(100);
    expect(results.find((p) => p.id === "otzmah-yehudit")!.score).toBe(0);
  });

  it("blends at configured weight for fixed opener with follow-ups + AI scores", () => {
    // opener = "peace": hadash=+2, otzmah=-2 (deterministic)
    // AI: hadash=0, otzmah=0 (neutral)
    // blend: hadash effectiveScore = 2*0.5 + 0*0.5 = 1.0 → normalized 0.75 → curved 0.75^n
    //        otzmah effectiveScore = -2*0.5 + 0*0.5 = -1.0 → normalized 0.25 → curved 0.25^n
    const allPartyAiScores = Object.fromEntries(
      ["hadash","raam","democrats","beyahad","yashar","beitenu","likud","shas","yahadut-hatorah","otzmah-yehudit"].map(id => [id, 0])
    );
    const { ranked: results } = calcResults(
      { security: 4 },
      { security: { openerAnswerId: "peace", openerAnswerText: "Peace", followUps: [{ question: "Q", options: ["A"], answer: "A" }] } },
      questionSet,
      { security: allPartyAiScores }
    );
    const expectedHadash = Math.round(Math.pow(0.75, SCORE_CURVE_POWER) * 100);
    const expectedOtzmah = Math.round(Math.pow(0.25, SCORE_CURVE_POWER) * 100);
    expect(results.find((p) => p.id === "hadash")!.score).toBe(expectedHadash);
    expect(results.find((p) => p.id === "otzmah-yehudit")!.score).toBe(expectedOtzmah);
  });

  it("falls back to deterministic when AI score is null for a specific party", () => {
    const aiScores = Object.fromEntries(
      ["hadash","raam","democrats","beyahad","yashar","beitenu","likud","shas","yahadut-hatorah"].map(id => [id, 0])
    );
    aiScores["otzmah-yehudit"] = null as unknown as number;
    const { ranked: results } = calcResults(
      { security: 4 },
      { security: { openerAnswerId: "peace", openerAnswerText: "Peace", followUps: [{ question: "Q", options: ["A"], answer: "A" }] } },
      questionSet,
      { security: aiScores }
    );
    // hadash: blended = 2*0.5 + 0*0.5 = 1.0 → normalized 0.75 → curved
    // otzmah: null AI → falls back to deterministic "peace" score = -2 → normalized 0 → 0%
    expect(results.find((p) => p.id === "hadash")!.score).toBe(Math.round(Math.pow(0.75, SCORE_CURVE_POWER) * 100));
    expect(results.find((p) => p.id === "otzmah-yehudit")!.score).toBe(0);
  });

  it("skips topic for a party when 'other' opener and AI score is null → score stays 50", () => {
    const aiWithNull: Record<string, number | null> = Object.fromEntries(
      ["hadash","raam","democrats","beyahad","yashar","beitenu","likud","shas","yahadut-hatorah"].map(id => [id, 0 as number | null])
    );
    aiWithNull["otzmah-yehudit"] = null;
    const { ranked: results } = calcResults(
      { security: 4 },
      { security: qa("other", "Custom") },
      questionSet,
      { security: aiWithNull }
    );
    expect(results.find((p) => p.id === "otzmah-yehudit")!.score).toBe(50);
  });

  it("falls back to pure deterministic when aiScores is undefined (AI call failed)", () => {
    const { ranked: results } = calcResults(
      { security: 3 },
      { security: { openerAnswerId: "control", openerAnswerText: "Control", followUps: [{ question: "Q", options: ["A"], answer: "A" }] } },
      questionSet,
      undefined
    );
    // "control": hadash=-2 → 0%, otzmah=+2 → 100%
    expect(results.find((p) => p.id === "otzmah-yehudit")!.score).toBe(100);
    expect(results.find((p) => p.id === "hadash")!.score).toBe(0);
  });

  it("FOLLOW_UP_AI_WEIGHT constant is 0.5", () => {
    expect(FOLLOW_UP_AI_WEIGHT).toBe(0.5);
  });
});

describe("calcResults — topicScores", () => {
  it("returns per-party per-topic 0–100 values (pre-curve)", () => {
    const { topicScores } = calcResults({ security: 3 }, { security: qa("peace") }, questionSet);
    // "peace": hadash=+2 → normalized (2+2)/4=1.0 → 100
    expect(topicScores["hadash"]["security"]).toBe(100);
    // "peace": otzmah=-2 → normalized (-2+2)/4=0.0 → 0
    expect(topicScores["otzmah-yehudit"]["security"]).toBe(0);
  });

  it("topicScore is raw normalized (pre-curve), not the curved final score", () => {
    // neutral option: all parties score 0 → normalized=0.5 → topicScore=50
    // but overall score is curved: 0.5^1.5 ≈ 0.354 → ~35, not 50
    const { ranked, topicScores } = calcResults(
      { security: 4 },
      { security: qa("neutral") },
      questionSetNeutral
    );
    const hadash = ranked.find((p) => p.id === "hadash")!;
    expect(topicScores["hadash"]["security"]).toBe(50);
    expect(hadash.score).toBe(Math.round(Math.pow(0.5, SCORE_CURVE_POWER) * 100));
    expect(hadash.score).not.toBe(50); // confirms curve actually applies
  });

  it("omits a party from topicScores when effectiveScore is null", () => {
    const aiWithNull: Record<string, number | null> = Object.fromEntries(
      ["hadash","raam","democrats","beyahad","yashar","beitenu","likud","shas","yahadut-hatorah"].map(id => [id, 2 as number | null])
    );
    aiWithNull["otzmah-yehudit"] = null;
    const { topicScores } = calcResults(
      { security: 4 },
      { security: qa("other", "Custom") },
      questionSet,
      { security: aiWithNull }
    );
    expect(topicScores["otzmah-yehudit"]?.["security"]).toBeUndefined();
  });

  it("covers all answered topics across multiple topics", () => {
    const { topicScores } = calcResults(
      { security: 3, economy: 2 },
      { security: qa("peace"), economy: qa("left-econ") },
      questionSet
    );
    expect(topicScores["hadash"]["security"]).toBe(100);
    expect(topicScores["hadash"]["economy"]).toBe(100);
  });
});

describe("calcResults — ties and extreme scores", () => {
  it("handles a full tie: all parties return with same score, no crash", () => {
    const { ranked } = calcResults(
      { security: 4 },
      { security: qa("neutral") },
      questionSetNeutral
    );
    expect(ranked).toHaveLength(PARTIES.length);
    const scores = ranked.map((p) => p.score);
    expect(scores.every((s) => s === scores[0])).toBe(true);
  });

  it("maximum divergence: winner scores 100, loser scores 0", () => {
    const { ranked } = calcResults({ security: 3 }, { security: qa("peace") }, questionSet);
    expect(ranked[0].score).toBe(100);
    expect(ranked[ranked.length - 1].score).toBe(0);
  });

  it("score curve makes a 50% topic score land below 50 overall", () => {
    // Confirms SCORE_CURVE_POWER > 1 actually penalises mismatches
    const { ranked } = calcResults(
      { security: 4 },
      { security: qa("neutral") },
      questionSetNeutral
    );
    ranked.forEach((p) => expect(p.score).toBeLessThan(50));
  });
});
