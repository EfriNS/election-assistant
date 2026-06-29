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

  it("filters to only covered aspects when coveredAspects is provided", () => {
    const result = buildGroundingsForParties(["partyA"], ["security"], {
      security: ["diplomacy", "budget"],
    });
    const entries = result["partyA"].topics[0].entries;
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.aspect)).toEqual(["diplomacy", "budget"]);
  });

  it("returns empty topics for a topic where no aspects match coveredAspects", () => {
    const result = buildGroundingsForParties(["partyA"], ["security"], {
      security: ["nonexistent-aspect"],
    });
    // No matching entries → topic is omitted from results
    expect(result["partyA"].topics).toHaveLength(0);
  });

  it("preserves the contrary field on entries that have it", () => {
    const result = buildGroundingsForParties(["partyA"], ["security"], {
      security: ["budget"],
    });
    expect(result["partyA"].topics[0].entries[0].contrary).toBe("מתנגד לתקציב הביטחון");
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
    // security: filtered to military only; economy: no coveredAspects → all shown
    const secEntries = result["partyA"].topics.find((t) => t.topicId === "security")!.entries;
    const ecoEntries = result["partyA"].topics.find((t) => t.topicId === "economy")!.entries;
    expect(secEntries).toHaveLength(1);
    expect(secEntries[0].aspect).toBe("military");
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
