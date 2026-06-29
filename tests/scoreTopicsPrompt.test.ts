import { describe, it, expect } from "vitest";
import { buildScoringPrompt } from "@/app/api/score-topics/route";

describe("buildScoringPrompt", () => {
  const baseTopic = {
    topicId: "security",
    topicLabel: "ביטחון",
    openerQuestion: "מה עמדתך?",
    openerAnswer: "תמיכה בפתרון מדיני",
    followUpQA: [],
  };

  it("includes the user's opener answer", () => {
    const prompt = buildScoringPrompt([baseTopic]);
    expect(prompt).toContain("תמיכה בפתרון מדיני");
  });

  it("includes the topic label", () => {
    const prompt = buildScoringPrompt([baseTopic]);
    expect(prompt).toContain("ביטחון");
  });

  it("includes follow-up Q&A when present", () => {
    const topicWithFollowUp = {
      ...baseTopic,
      followUpQA: [{ question: "מה תפקיד הבינלאומי?", answer: "חיוני" }],
    };
    const prompt = buildScoringPrompt([topicWithFollowUp]);
    expect(prompt).toContain("מה תפקיד הבינלאומי?");
    expect(prompt).toContain("חיוני");
  });

  it("includes output format placeholders for all party+topic combinations", () => {
    const prompt = buildScoringPrompt([baseTopic]);
    // Should contain the flat key format for the output
    expect(prompt).toContain("security.hadash");
    expect(prompt).toContain("security.democrats");
    expect(prompt).toContain("security.beyahad");
    expect(prompt).toContain("security.yashar");
    expect(prompt).toContain("security.beitenu");
    expect(prompt).toContain("security.likud");
    expect(prompt).toContain("security.shas");
  });

  it("includes null instruction for parties without platform", () => {
    const prompt = buildScoringPrompt([baseTopic]);
    // Parties without a platform should be listed for null instruction
    expect(prompt).toContain("null");
  });

  it("instructs not to use knowledge beyond provided texts", () => {
    const prompt = buildScoringPrompt([baseTopic]);
    expect(prompt).toContain("אל תשתמש בידע כלשהו");
  });

  it("includes freeTextInterpretation when provided", () => {
    const topicWithInterp = { ...baseTopic, freeTextInterpretation: "תמיכה חזקה בפתרון שתי המדינות" };
    const prompt = buildScoringPrompt([topicWithInterp]);
    expect(prompt).toContain("פרשנות:");
    expect(prompt).toContain("תמיכה חזקה בפתרון שתי המדינות");
  });

  it("omits freeTextInterpretation block when not provided", () => {
    const prompt = buildScoringPrompt([baseTopic]);
    expect(prompt).not.toContain("פרשנות:");
  });

  it("handles multiple topics", () => {
    const prompt = buildScoringPrompt([
      baseTopic,
      { topicId: "economy", topicLabel: "כלכלה", openerQuestion: "כלכלה?", openerAnswer: "צמיחה", followUpQA: [] },
    ]);
    expect(prompt).toContain("economy.hadash");
    expect(prompt).toContain("security.hadash");
  });
});
