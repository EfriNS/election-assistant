import { describe, it, expect } from "vitest";
import { getScoringAspects, getScoringEntries, buildScoringPrompt, type TopicQAForScoring } from "@/lib/score-topics-prompt";
import { entryAspects, getBestEvidenceForAspect, getBestEvidenceForTopic, getTopicGroundings } from "@/lib/groundings";
import { PARTIES } from "@/lib/parties";

// Follow-up answers are scored against the sub-dimensions the follow-ups
// probed, not the party's whole topic text: sending everything tripled the
// prompt after the 2026-10 full harvest and made scores measurably noisier.
function topic(overrides: Partial<TopicQAForScoring> = {}): TopicQAForScoring {
  return {
    topicId: "religion",
    topicLabel: "דת ומדינה",
    openerQuestion: "שאלה",
    openerAnswer: "תשובה",
    followUpQA: [{ question: "שאלת המשך", answer: "תשובה", targetedAspect: "haredi-draft-and-service-burden" }],
    ...overrides,
  };
}

describe("getScoringAspects", () => {
  it("returns the sub-dimension a single follow-up probed", () => {
    expect(getScoringAspects(topic())).toEqual(["haredi-draft-and-service-burden"]);
  });

  it("returns every distinct sub-dimension when several follow-ups were asked", () => {
    const t = topic({
      followUpQA: [
        { question: "א", answer: "א", targetedAspect: "haredi-draft-and-service-burden" },
        { question: "ב", answer: "ב", targetedAspect: "national-religious-symbolism" },
        { question: "ג", answer: "ג", targetedAspect: "haredi-draft-and-service-burden" },
      ],
    });
    expect(getScoringAspects(t)).toEqual(["haredi-draft-and-service-burden", "national-religious-symbolism"]);
  });

  it("is null (whole topic) for a free-text opener, even with a targeted follow-up", () => {
    expect(getScoringAspects(topic({ openerIsFreeText: true }))).toBeNull();
  });

  it("is null (whole topic) when there are no follow-ups", () => {
    expect(getScoringAspects(topic({ followUpQA: [] }))).toBeNull();
  });

  it("is null (whole topic) when any follow-up has no targetedAspect — e.g. a session started before the client sent it", () => {
    const t = topic({
      followUpQA: [
        { question: "א", answer: "א", targetedAspect: "haredi-draft-and-service-burden" },
        { question: "ב", answer: "ב" },
      ],
    });
    expect(getScoringAspects(t)).toBeNull();
  });

  it("is null (whole topic) when a targetedAspect is not a canonical id of that topic", () => {
    for (const bad of ["made-up-aspect", "gender-equality", "__proto__", 7 as unknown as string]) {
      expect(getScoringAspects(topic({ followUpQA: [{ question: "א", answer: "א", targetedAspect: bad }] }))).toBeNull();
    }
  });
});

describe("getScoringEntries", () => {
  it("keeps only entries that address a probed sub-dimension, as primary or secondary label", () => {
    const t = topic();
    let narrowed = 0;
    for (const party of PARTIES) {
      const all = getBestEvidenceForTopic(party.id, t.topicId);
      const sent = getScoringEntries(party.id, t);
      for (const e of sent) expect(entryAspects(e)).toContain("haredi-draft-and-service-burden");
      expect(sent).toEqual(getBestEvidenceForAspect(party.id, t.topicId, "haredi-draft-and-service-burden"));
      if (sent.length < all.length) narrowed++;
    }
    expect(narrowed).toBeGreaterThan(0);
  });

  const isOfficial = (e: { provenance: string }) => e.provenance.startsWith("official");

  it("official-first applies per sub-dimension: third-party text is used only where no official entry addresses that sub-dimension", () => {
    let fallbackCases = 0;
    for (const party of PARTIES) {
      for (const aspect of ["military-doctrine", "territorial-endgame-specifics", "hardline-enforcement"]) {
        const onAspect = getTopicGroundings(party.id, "security").filter(
          (e) => !e.absent && e.text.length > 0 && entryAspects(e).includes(aspect)
        );
        const sent = getBestEvidenceForAspect(party.id, "security", aspect);
        if (onAspect.some(isOfficial)) {
          expect(sent.every(isOfficial)).toBe(true);
          expect(sent).toHaveLength(onAspect.filter(isOfficial).length);
        } else {
          expect(sent).toHaveLength(onAspect.length);
          // The case this rule exists for: official text elsewhere in the topic, none on this sub-dimension.
          if (onAspect.length > 0 && getTopicGroundings(party.id, "security").some(isOfficial)) fallbackCases++;
        }
      }
    }
    expect(fallbackCases).toBeGreaterThan(0);
  });

  it("sends an entry once when it addresses two probed sub-dimensions", () => {
    const t = topic({
      topicId: "security",
      followUpQA: [
        { question: "א", answer: "א", targetedAspect: "territorial-endgame-specifics" },
        { question: "ב", answer: "ב", targetedAspect: "foreign-policy-and-nonproliferation" },
      ],
    });
    for (const party of PARTIES) {
      const sent = getScoringEntries(party.id, t);
      expect(new Set(sent).size).toBe(sent.length);
    }
    // democrats has an entry labelled with both (territorial primary, foreign-policy secondary)
    const both = getScoringEntries("democrats", t).filter(
      (e) => entryAspects(e).includes("territorial-endgame-specifics") && entryAspects(e).includes("foreign-policy-and-nonproliferation")
    );
    expect(both.length).toBeGreaterThan(0);
  });

  it("returns the party's whole best-evidence set when the topic is not narrowed", () => {
    const t = topic({ openerIsFreeText: true });
    for (const party of PARTIES) {
      expect(getScoringEntries(party.id, t)).toEqual(getBestEvidenceForTopic(party.id, t.topicId));
    }
  });
});

describe("buildScoringPrompt with a probed sub-dimension", () => {
  it("is shorter than the whole-topic prompt and quotes no entry outside the probed sub-dimension", () => {
    const narrowed = buildScoringPrompt([topic()]);
    const whole = buildScoringPrompt([topic({ followUpQA: [{ question: "שאלת המשך", answer: "תשובה" }] })]);
    expect(narrowed.length).toBeLessThan(whole.length);
    for (const party of PARTIES) {
      for (const e of getBestEvidenceForTopic(party.id, "religion")) {
        if (!entryAspects(e).includes("haredi-draft-and-service-burden")) {
          expect(narrowed).not.toContain(`"${e.text}"`);
        }
      }
    }
  });
});
