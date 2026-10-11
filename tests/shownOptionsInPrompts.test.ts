import { describe, it, expect } from "vitest";
import { buildScoringPrompt, type TopicQAForScoring } from "@/lib/score-topics-prompt";
import { buildPrompt } from "@/app/api/follow-up/route";
import { sanitizeOptionList } from "@/lib/sanitize";

// Regression guard for a 2026-10-12 run: the UI numbers every answer option, the
// user typed "3+1" as a free-text opener, and neither AI call was shown the
// options. The follow-up model invented an interpretation ("hawkish, decisive"),
// the scoring model scored on it, and a left-wing answer ranked right-wing
// parties first. Both prompts must carry the numbered options the user saw.
const OPENER_OPTIONS = ["שליטה ביטחונית מלאה", "הסדר אזורי בתיאום עם המערב", "שלום והסדר מדיני"];
const FOLLOW_UP_OPTIONS = ["החלת ריבונות מלאה", "פירוז ומנגנוני אכיפה", "נסיגה לגבולות 1967", "אחר — פרט"];

describe("scoring prompt: numbered options for free-text answers", () => {
  const topic: TopicQAForScoring = {
    topicId: "security",
    topicLabel: "ביטחון",
    openerQuestion: "מהי הגישה הנכונה?",
    openerAnswer: "3+1",
    openerIsFreeText: true,
    openerOptions: OPENER_OPTIONS,
    followUpQA: [{ question: "מה המתווה המועדף?", answer: "דומה ל-3 אבל לא בהכרח בגבולות 67", options: FOLLOW_UP_OPTIONS }],
  };

  it("lists the opener's options, numbered in the order shown, above a free-text opener answer", () => {
    const prompt = buildScoringPrompt([topic]);
    const list = "1. שליטה ביטחונית מלאה | 2. הסדר אזורי בתיאום עם המערב | 3. שלום והסדר מדיני";
    expect(prompt).toContain(list);
    expect(prompt.indexOf(list)).toBeLessThan(prompt.indexOf("תשובה: 3+1"));
  });

  it("lists a follow-up's options, numbered, above its answer", () => {
    const prompt = buildScoringPrompt([topic]);
    const list = "1. החלת ריבונות מלאה | 2. פירוז ומנגנוני אכיפה | 3. נסיגה לגבולות 1967 | 4. אחר — פרט";
    expect(prompt).toContain(list);
    expect(prompt.indexOf(list)).toBeLessThan(prompt.indexOf("תשובה: דומה ל-3"));
  });

  it("tells the model to resolve number references from the list, not by guessing", () => {
    expect(buildScoringPrompt([topic])).toContain("פרש אותה לפי רשימת האפשרויות");
  });

  it("does not list opener options for a preset opener answer — its text already is the option", () => {
    const preset = { ...topic, openerIsFreeText: false, openerAnswer: OPENER_OPTIONS[2], followUpQA: [] };
    expect(buildScoringPrompt([preset])).not.toContain("1. שליטה ביטחונית מלאה");
  });
});

describe("follow-up prompt: numbered options for free-text answers", () => {
  const build = (openerIsFreeText: boolean) =>
    buildPrompt(
      [],
      {
        label: "ביטחון",
        openerQuestion: "מהי הגישה הנכונה?",
        openerAnswer: "3+1",
        openerOptions: OPENER_OPTIONS,
        followUpQA: [{ question: "מה המתווה המועדף?", answer: "דומה ל-3", options: FOLLOW_UP_OPTIONS }],
      },
      null, "formal", 2, "חשוב", 1, [], {}, null, [], openerIsFreeText
    );

  it("lists the opener's numbered options before a free-text opener answer", () => {
    const prompt = build(true);
    const list = "1. שליטה ביטחונית מלאה | 2. הסדר אזורי בתיאום עם המערב | 3. שלום והסדר מדיני";
    expect(prompt).toContain(list);
    expect(prompt.indexOf(list)).toBeLessThan(prompt.indexOf("User's answer: 3+1"));
    expect(prompt).toContain("never guess");
  });

  it("lists each earlier follow-up's numbered options", () => {
    expect(build(true)).toContain("1. החלת ריבונות מלאה | 2. פירוז ומנגנוני אכיפה | 3. נסיגה לגבולות 1967 | 4. אחר — פרט");
  });

  it("omits the opener's options for a preset opener", () => {
    expect(build(false)).not.toContain("1. שליטה ביטחונית מלאה");
  });
});

describe("sanitizeOptionList", () => {
  it("keeps a list of strings, stripping angle brackets", () => {
    expect(sanitizeOptionList(["אפשרות <b>א</b>", "אפשרות ב"])).toEqual(["אפשרות bא/b", "אפשרות ב"]);
  });

  it("returns undefined for anything that is not a non-empty list of strings", () => {
    for (const bad of [undefined, null, "1. א", 7, {}, [], [1, 2], [""], ["<>"]]) {
      expect(sanitizeOptionList(bad)).toBeUndefined();
    }
  });

  it("bounds the number of options and the length of each", () => {
    const result = sanitizeOptionList(Array.from({ length: 50 }, () => "א".repeat(5000)))!;
    expect(result).toHaveLength(8);
    expect(result[0]).toHaveLength(300);
  });
});
