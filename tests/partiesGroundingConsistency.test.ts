import { describe, it, expect } from "vitest";
import { GROUNDINGS, derivePartySourceQuality } from "@/lib/groundings";
import { PARTIES } from "@/lib/parties";

// Regression guard for VAA-DESIGN.md item 63: lib/parties.ts (hand-maintained
// UI labels: platformUrl, platformLabel) and data/groundings/*.json (live-derived
// facts: platformAvailable, sourceQuality) are two separate sources of truth that
// must agree. This has drifted twice in production-visible ways (2026-06-26,
// 2026-07-04) — both times a party had a real official-current grounding source
// but no platformUrl in parties.ts, so the results page/PDF showed "ללא מצע רשמי"
// (no official platform) despite the app having the data.
describe("parties.ts / grounding data consistency", () => {
  for (const party of PARTIES) {
    const grounding = GROUNDINGS[party.id];

    it(`${party.id}: has a GROUNDINGS entry`, () => {
      expect(grounding, `PARTIES has "${party.id}" but GROUNDINGS does not`).toBeDefined();
    });

    if (!grounding) continue;

    const sourceQuality = derivePartySourceQuality(grounding);

    it(`${party.id}: official source quality requires a platformUrl in parties.ts`, () => {
      if (sourceQuality !== "official") return;
      expect(
        party.platformUrl,
        `${party.id} has an official-current grounding source but no platformUrl in lib/parties.ts — ` +
          `the results page/PDF will show "ללא מצע רשמי" despite the app having the data`
      ).toBeTruthy();
    });

    it(`${party.id}: platformLabel doesn't say "(לא מצע)" for an official source`, () => {
      if (sourceQuality !== "official" || !party.platformLabel) return;
      expect(
        party.platformLabel.includes("לא מצע"),
        `${party.id} has an official-current grounding source but platformLabel ("${party.platformLabel}") says it isn't a platform`
      ).toBe(false);
    });
  }
});
