import { describe, it, expect } from "vitest";
import { buildPrompt } from "@/app/api/follow-up/route";
import { SYSTEM_PROMPT } from "@/app/api/results/route";

// Regression guard for a 2026-07-09 production incident: Gemini emitted a
// plain ASCII quote instead of gershayim inside a Hebrew acronym (צה"ל,
// סד"כ), which silently closed the JSON string early — JSON.parse still
// succeeded, so the retry-once path never caught it and a truncated
// follow-up option ("הרחבת סד") reached a real user. The prior prompt
// instruction ("use gershayim, not ASCII quote") was already in place when
// this happened and wasn't enough — see docs/learnings/project/AI-INTEGRATION.md.
// The fix avoids the risky character choice entirely instead of relying on
// the model picking the right one.
describe("acronym-with-internal-quote hardening", () => {
  const baseTopic = {
    label: "ביטחון",
    openerQuestion: "מה עמדתך?",
    openerAnswer: "תמיכה בחיזוק הביטחון",
    followUpQA: [],
  };

  function buildFollowUpPrompt() {
    return buildPrompt([], baseTopic, null, "formal", 2, "חשוב", 0, [], {}, null, [], false);
  }

  it("follow-up prompt no longer instructs gershayim as the primary fix", () => {
    const prompt = buildFollowUpPrompt();
    expect(prompt).not.toContain("use the Hebrew gershayim character ״ (U+05F4), never a plain ASCII double-quote");
  });

  it("follow-up prompt tells the model to prefer plain-word substitutes", () => {
    const prompt = buildFollowUpPrompt();
    expect(prompt).toContain('הצבא (not צה"ל)');
    expect(prompt).toContain('סדר הכוחות (not סד"כ)');
  });

  it("follow-up prompt gives a single-geresh fallback for unlisted acronyms", () => {
    const prompt = buildFollowUpPrompt();
    expect(prompt).toContain("single geresh ׳ (U+05F3)");
  });

  it("results prompt tells the model to prefer plain-word substitutes in its own prose", () => {
    expect(SYSTEM_PROMPT).toContain('הצבא (not צה"ל)');
  });

  it("results prompt normalizes verbatim-quote acronyms to single geresh instead of gershayim", () => {
    expect(SYSTEM_PROMPT).toContain("single geresh ׳ (U+05F3)");
    expect(SYSTEM_PROMPT).not.toContain("use the Hebrew gershayim character ״ (U+05F4), never a plain ASCII double-quote");
  });
});
