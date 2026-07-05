import { describe, it, expect } from "vitest";
import { selectSuggestedDimension } from "@/lib/groundings";
import type { GroundingEntry } from "@/lib/groundings";

// Minimal fixture builder — only the fields selectSuggestedDimension reads.
function entry(overrides: Partial<GroundingEntry> & { aspect: string }): GroundingEntry {
  return {
    text: "some text",
    absent: false,
    sourceUrl: "https://example.com",
    archivePath: "",
    dateRetrieved: "2024-01-01",
    provenance: "official-current",
    concreteness: "generic",
    ...overrides,
  };
}

describe("selectSuggestedDimension", () => {
  it("picks the first uncovered dimension with official-provenance evidence from any party", () => {
    const groundingMap = {
      partyA: [entry({ aspect: "military-doctrine" })],
    };
    const result = selectSuggestedDimension(["territorial-endgame-specifics", "military-doctrine"], groundingMap);
    expect(result).toBe("military-doctrine");
  });

  it("regression 2026-07-05: a dimension is suggested even when only a single, currently-not-close party has grounding for it", () => {
    // This is exactly the bug: a security opener favoring self-reliance made
    // every left-leaning party's grounded territorial-policy position
    // invisible, because they weren't "close" on an unrelated axis yet.
    // selectSuggestedDimension must not require the party to be pre-filtered
    // by any notion of closeness — it should just look at whatever grounding
    // map it's handed.
    const groundingMap = {
      "far-right-party": [], // no grounding for this dimension
      "not-currently-close-left-party": [
        entry({ aspect: "territorial-endgame-specifics", text: "נסיגה לגבולות 1967" }),
      ],
    };
    const result = selectSuggestedDimension(["territorial-endgame-specifics"], groundingMap);
    expect(result).toBe("territorial-endgame-specifics");
  });

  it("prefers official-provenance evidence over third-party/joint-list when both exist for different dims", () => {
    const groundingMap = {
      partyA: [
        entry({ aspect: "dim-with-thirdparty-only", provenance: "third-party" }),
        entry({ aspect: "dim-with-official", provenance: "official-current" }),
      ],
    };
    const result = selectSuggestedDimension(["dim-with-thirdparty-only", "dim-with-official"], groundingMap);
    expect(result).toBe("dim-with-official");
  });

  it("falls back to any-evidence (non-official) when no uncovered dimension has official backing", () => {
    const groundingMap = {
      partyA: [entry({ aspect: "some-dim", provenance: "third-party" })],
    };
    const result = selectSuggestedDimension(["some-dim"], groundingMap);
    expect(result).toBe("some-dim");
  });

  it("falls back to the first uncovered dimension when no party has any evidence at all", () => {
    const groundingMap = { partyA: [entry({ aspect: "unrelated-dim" })] };
    const result = selectSuggestedDimension(["dim-with-no-evidence", "another-dim"], groundingMap);
    expect(result).toBe("dim-with-no-evidence");
  });

  it("returns null when there are no uncovered dimensions", () => {
    expect(selectSuggestedDimension([], { partyA: [entry({ aspect: "x" })] })).toBeNull();
  });

  it("ignores absent entries when searching for evidence — a real match elsewhere wins over an earlier-priority absent-only dim", () => {
    const groundingMap = {
      partyA: [
        entry({ aspect: "dim-with-only-absent-entry", absent: true }),
        entry({ aspect: "dim-with-real-evidence" }),
      ],
    };
    const result = selectSuggestedDimension(
      ["dim-with-only-absent-entry", "dim-with-real-evidence"],
      groundingMap
    );
    expect(result).toBe("dim-with-real-evidence");
  });
});
