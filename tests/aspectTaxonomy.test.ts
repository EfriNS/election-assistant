import { describe, it, expect } from "vitest";
import { GROUNDINGS } from "@/lib/groundings";
import { TOPIC_KEY_DIMENSIONS } from "@/lib/questions";

// Regression guard for the canonical aspect taxonomy (TODO #2 option (a)):
// every grounding entry's `aspect` must be a member of its topic's fixed
// bucket list. Drifting back to free-text slugs during ingestion is exactly
// what silently broke cross-party matching before.
describe("aspect taxonomy conformance", () => {
  for (const [partyId, party] of Object.entries(GROUNDINGS)) {
    for (const [topicId, entries] of Object.entries(party.topics)) {
      it(`${partyId}/${topicId}: every aspect is a canonical id`, () => {
        const canonical = TOPIC_KEY_DIMENSIONS[topicId];
        expect(canonical, `no TOPIC_KEY_DIMENSIONS entry for topic "${topicId}"`).toBeDefined();
        for (const entry of entries) {
          expect(
            canonical.includes(entry.aspect),
            `${partyId}/${topicId} has non-canonical aspect "${entry.aspect}" (text: "${entry.text.slice(0, 40)}...")`
          ).toBe(true);
        }
      });
    }
  }
});
