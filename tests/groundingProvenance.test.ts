import { describe, it, expect } from "vitest";
import {
  GROUNDINGS,
  derivePartySourceQuality,
  compareEntryQuality,
  getBestEvidenceForTopic,
  type GroundingEntry,
  type Provenance,
  type Concreteness,
} from "@/lib/groundings";

const VALID_PROVENANCE: Provenance[] = ["official-current", "official-outdated", "joint-list", "third-party"];
const VALID_CONCRETENESS: Concreteness[] = ["quantified", "named-mechanism", "specific-stance", "generic"];

// Regression guard for the two-field source-quality model: every non-absent
// grounding entry must carry both a provenance (who wrote it) and a
// concreteness (how checkable the claim is) value from the fixed enums.
// Silently omitting these on newly-added entries would make them invisible
// to getBestEvidenceForTopic's official-first filtering — they'd just crash
// compareEntryQuality's sort instead of failing loudly, so this test exists
// to fail loudly instead.
describe("provenance/concreteness schema conformance", () => {
  for (const [partyId, party] of Object.entries(GROUNDINGS)) {
    for (const [topicId, entries] of Object.entries(party.topics)) {
      it(`${partyId}/${topicId}: every non-absent entry has valid provenance + concreteness`, () => {
        for (const entry of entries as GroundingEntry[]) {
          if (entry.absent) continue;
          expect(
            VALID_PROVENANCE.includes(entry.provenance),
            `${partyId}/${topicId} has invalid/missing provenance "${entry.provenance}" (text: "${entry.text.slice(0, 40)}...")`
          ).toBe(true);
          expect(
            VALID_CONCRETENESS.includes(entry.concreteness),
            `${partyId}/${topicId} has invalid/missing concreteness "${entry.concreteness}" (text: "${entry.text.slice(0, 40)}...")`
          ).toBe(true);
        }
      });
    }
  }
});

describe("derivePartySourceQuality", () => {
  const makeParty = (provenances: Provenance[]) => ({
    platformAvailable: true,
    topics: {
      security: provenances.map((provenance, i) => ({
        text: `t${i}`,
        aspect: "x",
        sourceUrl: "https://x.com",
        archivePath: "",
        dateRetrieved: "2024-01-01",
        provenance,
        concreteness: "generic" as Concreteness,
      })),
    },
  });

  it("returns 'official' when any entry is official-current", () => {
    expect(derivePartySourceQuality(makeParty(["third-party", "official-current"]))).toBe("official");
  });

  it("returns 'outdated' when the best entry is official-outdated (no official-current)", () => {
    expect(derivePartySourceQuality(makeParty(["third-party", "official-outdated"]))).toBe("outdated");
  });

  it("returns 'thirdParty' when no official entry exists at all", () => {
    expect(derivePartySourceQuality(makeParty(["joint-list", "third-party"]))).toBe("thirdParty");
  });

  it("ignores absent entries", () => {
    const pg = {
      platformAvailable: true,
      topics: {
        security: [
          { text: "", aspect: "x", sourceUrl: "", archivePath: "", dateRetrieved: "2024-01-01", provenance: "official-current" as Provenance, concreteness: "generic" as Concreteness, absent: true },
          { text: "t", aspect: "x", sourceUrl: "", archivePath: "", dateRetrieved: "2024-01-01", provenance: "third-party" as Provenance, concreteness: "generic" as Concreteness },
        ],
      },
    };
    expect(derivePartySourceQuality(pg)).toBe("thirdParty");
  });
});

describe("compareEntryQuality", () => {
  const entry = (provenance: Provenance, concreteness: Concreteness): GroundingEntry => ({
    text: "t",
    aspect: "x",
    sourceUrl: "https://x.com",
    archivePath: "",
    dateRetrieved: "2024-01-01",
    provenance,
    concreteness,
  });

  it("ranks provenance above concreteness (a generic official beats a quantified third-party claim)", () => {
    const officialGeneric = entry("official-current", "generic");
    const thirdPartyQuantified = entry("third-party", "quantified");
    expect(compareEntryQuality(officialGeneric, thirdPartyQuantified)).toBeLessThan(0);
  });

  it("breaks ties within the same provenance by concreteness", () => {
    const quantified = entry("official-current", "quantified");
    const generic = entry("official-current", "generic");
    expect(compareEntryQuality(quantified, generic)).toBeLessThan(0);
  });

  it("treats identical provenance+concreteness as equal", () => {
    const a = entry("joint-list", "specific-stance");
    const b = entry("joint-list", "specific-stance");
    expect(compareEntryQuality(a, b)).toBe(0);
  });
});

describe("getBestEvidenceForTopic", () => {
  it("returns only official entries when official material exists, even if third-party is more concrete", () => {
    // shas has official-outdated entries only (2006 principles doc, no third-party in most topics)
    // otzmah-yehudit mixes official-current (new) with third-party (old ozma-yeudit.com/JVL) —
    // a real case where the fallback logic actually matters.
    const entries = getBestEvidenceForTopic("otzmah-yehudit", "security");
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.provenance === "official-current" || e.provenance === "official-outdated")).toBe(true);
  });

  it("falls back to non-official evidence when a party has no official material for a topic", () => {
    // raam has zero official-current/outdated entries anywhere — all third-party (coalition agreement analysis)
    const entries = getBestEvidenceForTopic("raam", "housing");
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.provenance === "third-party")).toBe(true);
  });

  it("sorts returned entries best-evidence-first", () => {
    const entries = getBestEvidenceForTopic("beitenu", "security");
    for (let i = 1; i < entries.length; i++) {
      expect(compareEntryQuality(entries[i - 1], entries[i])).toBeLessThanOrEqual(0);
    }
  });
});
