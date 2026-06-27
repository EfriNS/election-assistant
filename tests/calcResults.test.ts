import { describe, it, expect } from "vitest";
import { calcResults, FOLLOW_UP_AI_WEIGHT } from "@/lib/scoring";
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
    // blend: hadash = 2*(1-0.5) + 0*0.5 = 1.0 → (1+2)/4*100 = 75%
    //        otzmah = -2*(1-0.5) + 0*0.5 = -1.0 → (-1+2)/4*100 = 25%
    const allPartyAiScores = Object.fromEntries(
      ["hadash","raam","democrats","beyahad","yashar","beitenu","likud","shas","yahadut-hatorah","otzmah-yehudit"].map(id => [id, 0])
    );
    const { ranked: results } = calcResults(
      { security: 4 },
      { security: { openerAnswerId: "peace", openerAnswerText: "Peace", followUps: [{ question: "Q", options: ["A"], answer: "A" }] } },
      questionSet,
      { security: allPartyAiScores }
    );
    expect(results.find((p) => p.id === "hadash")!.score).toBe(75);
    expect(results.find((p) => p.id === "otzmah-yehudit")!.score).toBe(25);
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
    // hadash: blended = 2*0.5 + 0*0.5 = 1 → 75%
    // otzmah: null AI → falls back to deterministic "peace" score = -2 → 0%
    expect(results.find((p) => p.id === "hadash")!.score).toBe(75);
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
