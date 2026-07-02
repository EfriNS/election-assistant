import { describe, it, expect, vi } from "vitest";

// Must mock before importing the module under test
vi.mock("@/lib/groundings", () => ({
  GROUNDINGS: {
    partyA: {
      platformAvailable: true,
      topics: {
        security: [
          { text: "Text diplomacy", aspect: "diplomacy", absent: false, sourceUrl: "https://a.com", archivePath: "", dateRetrieved: "2024-01-01" },
          { text: "Text military",  aspect: "military",  absent: false, sourceUrl: "https://a.com", archivePath: "", dateRetrieved: "2024-01-01" },
          { text: "Text budget",    aspect: "budget",    absent: false, sourceUrl: "https://a.com", archivePath: "", dateRetrieved: "2024-01-01", contrary: "מתנגד לתקציב הביטחון" },
          { text: "",               aspect: "empty",     absent: false, sourceUrl: "https://a.com", archivePath: "", dateRetrieved: "2024-01-01" },
          { text: "Text absent",    aspect: "absent",    absent: true,  sourceUrl: "https://a.com", archivePath: "", dateRetrieved: "2024-01-01" },
        ],
        economy: [
          { text: "Text growth", aspect: "growth", absent: false, sourceUrl: "https://a.com", archivePath: "", dateRetrieved: "2024-01-01" },
        ],
      },
    },
    partyB: {
      platformAvailable: false,
      topics: {},
    },
  },
  getTopicGroundings: vi.fn(),
}));

vi.mock("@/lib/topics", () => ({
  TOPIC_LABELS: { security: "ביטחון", economy: "כלכלה" },
}));

import { buildGroundingsForParties } from "@/app/api/results/route";

describe("buildGroundingsForParties", () => {
  it("returns all non-absent entries when coveredAspects is empty (no follow-ups taken)", () => {
    const result = buildGroundingsForParties(["partyA"], ["security"], {});
    const entries = result["partyA"].topics[0].entries;
    // diplomacy, military, budget pass; empty text and absent are excluded
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.aspect)).toEqual(["diplomacy", "military", "budget"]);
  });

  it("still shows all entries when coveredAspects is provided, matched ones sorted first", () => {
    const result = buildGroundingsForParties(["partyA"], ["security"], {
      security: ["diplomacy", "budget"],
    });
    const entries = result["partyA"].topics[0].entries;
    // All 3 non-absent entries remain — nothing is hidden on tag-mismatch
    expect(entries).toHaveLength(3);
    // Matched entries (diplomacy, budget) come first, in original relative order;
    // unmatched (military) follows.
    expect(entries.map((e) => e.aspect)).toEqual(["diplomacy", "budget", "military"]);
    expect(entries.map((e) => e.matched)).toEqual([true, true, undefined]);
  });

  it("shows all entries (none flagged matched) when no aspect tag matches coveredAspects", () => {
    const result = buildGroundingsForParties(["partyA"], ["security"], {
      security: ["nonexistent-aspect"],
    });
    // Regression: this used to zero out the topic entirely on tag-mismatch.
    const entries = result["partyA"].topics[0].entries;
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.aspect)).toEqual(["diplomacy", "military", "budget"]);
    expect(entries.every((e) => e.matched === undefined)).toBe(true);
  });

  it("preserves the contrary field on entries that have it", () => {
    const result = buildGroundingsForParties(["partyA"], ["security"], {
      security: ["budget"],
    });
    const budgetEntry = result["partyA"].topics[0].entries.find((e) => e.aspect === "budget")!;
    expect(budgetEntry.contrary).toBe("מתנגד לתקציב הביטחון");
    expect(budgetEntry.matched).toBe(true);
  });

  it("handles a party with no platform (absent from GROUNDINGS topics)", () => {
    const result = buildGroundingsForParties(["partyB"], ["security"], {});
    // partyB has no topics entry at all
    expect(result["partyB"].topics).toHaveLength(0);
    expect(result["partyB"].platformAvailable).toBe(false);
  });

  it("handles multiple topics independently", () => {
    const result = buildGroundingsForParties(["partyA"], ["security", "economy"], {
      security: ["military"],
    });
    // security: military sorted first (matched), rest follow in source order; economy: no coveredAspects → all shown
    const secEntries = result["partyA"].topics.find((t) => t.topicId === "security")!.entries;
    const ecoEntries = result["partyA"].topics.find((t) => t.topicId === "economy")!.entries;
    expect(secEntries.map((e) => e.aspect)).toEqual(["military", "diplomacy", "budget"]);
    expect(secEntries[0].matched).toBe(true);
    expect(ecoEntries).toHaveLength(1);
    expect(ecoEntries[0].aspect).toBe("growth");
  });

  it("excludes topics not in answeredTopicIds", () => {
    const result = buildGroundingsForParties(["partyA"], ["economy"], {});
    const topicIds = result["partyA"].topics.map((t) => t.topicId);
    expect(topicIds).toEqual(["economy"]);
    expect(topicIds).not.toContain("security");
  });
});
