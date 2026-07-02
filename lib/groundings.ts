// Party platform grounding data.
// Source of truth lives in data/groundings/<partyId>.json — edit those files, not here.
// lib/groundings.ts provides typed access and helper functions.
//
// JSON files are human-editable by any slightly-technical reviewer without TypeScript knowledge.
// Add new party quotes there; this file picks them up automatically.

import hadashData from "../data/groundings/hadash.json";
import raamData from "../data/groundings/raam.json";
import democratsData from "../data/groundings/democrats.json";
import beyahadData from "../data/groundings/beyahad.json";
import yasharData from "../data/groundings/yashar.json";
import beitenuData from "../data/groundings/beitenu.json";
import likudData from "../data/groundings/likud.json";
import shasData from "../data/groundings/shas.json";
import yahadutData from "../data/groundings/yahadut-hatorah.json";
import otzmahData from "../data/groundings/otzmah-yehudit.json";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GroundingEntry = {
  text: string;           // verbatim Hebrew quote from the party's source document
  aspect: string;         // canonical sub-dimension id — must be a member of TOPIC_KEY_DIMENSIONS[topicId] (lib/questions.ts)
  sourceUrl: string;      // URL of the original document
  archivePath: string;    // relative path: docs/sources/<partyId>/YYYY-MM-DD-<description>.md
  dateRetrieved: string;  // ISO date (YYYY-MM-DD)
  contrary?: string;      // a position the party explicitly opposes (optional)
  absent?: boolean;       // true = party has no known position on this sub-dimension
};

export type PartyGroundings = {
  platformAvailable: boolean;
  platformLabel?: string;
  sourceQuality?: "official" | "thirdParty" | "outdated";
  sourceUrl?: string;
  archiveDir?: string;
  topics: Record<string, GroundingEntry[]>;
};

export type GroundingsMap = Record<string, PartyGroundings>;

// ─── Data ─────────────────────────────────────────────────────────────────────

export const GROUNDINGS: GroundingsMap = {
  hadash:           hadashData    as PartyGroundings,
  raam:             raamData      as PartyGroundings,
  democrats:        democratsData as PartyGroundings,
  beyahad:          beyahadData   as PartyGroundings,
  yashar:           yasharData    as PartyGroundings,
  beitenu:          beitenuData   as PartyGroundings,
  likud:            likudData     as PartyGroundings,
  shas:             shasData      as PartyGroundings,
  "yahadut-hatorah": yahadutData  as PartyGroundings,
  "otzmah-yehudit":  otzmahData   as PartyGroundings,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns grounding entries for a party on a specific topic. Empty array if none. */
export function getTopicGroundings(partyId: string, topicId: string): GroundingEntry[] {
  return GROUNDINGS[partyId]?.topics[topicId] ?? [];
}

/** True if a party has any published platform source (even if quotes are not yet collected). */
export function partyHasPublishedPlatform(partyId: string): boolean {
  return GROUNDINGS[partyId]?.platformAvailable === true;
}

/** True if a party has at least one grounding entry with actual text for a given topic. */
export function partyHasGroundingForTopic(partyId: string, topicId: string): boolean {
  return getTopicGroundings(partyId, topicId).some((e) => !e.absent && e.text.length > 0);
}

/**
 * Returns all parties' grounding entries for a topic, keyed by partyId.
 * Only includes parties that have at least one non-absent entry.
 */
export function getGroundingsForTopic(topicId: string): Record<string, GroundingEntry[]> {
  return Object.fromEntries(
    Object.entries(GROUNDINGS)
      .map(([partyId, pg]) => [partyId, pg.topics[topicId] ?? []] as const)
      .filter(([, entries]) => entries.some((e) => !e.absent && e.text.length > 0))
  );
}
