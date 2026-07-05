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

// Where this entry's text actually comes from, independent of how specific it is.
// A per-document property: every entry from the same source URL/document shares
// the same provenance. Priority order for scoring/quoting (highest first):
//   official-current > official-outdated > joint-list > third-party
export type Provenance =
  | "official-current"   // the party's own current site/document
  | "official-outdated"  // the party's own document, but stale/no longer current (e.g. a 2016 constitution, a 2006 principles doc)
  | "joint-list"          // a genuine joint-list partner's own material (e.g. Maki's principles page for חד"ש-תע"ל) — not the party's own domain, but not an outsider either
  | "third-party";        // journalism/analysis/unofficial-supporter content — not authored by the party or a formal list partner

// How specific/checkable the claim itself is, independent of who wrote it.
// A per-entry property: two entries from the same document can differ here.
// Priority order for scoring/quoting within the same provenance (highest first):
//   quantified > named-mechanism > specific-stance > generic
export type Concreteness =
  | "quantified"        // a number: budget figure, percentage, count, date, timeframe
  | "named-mechanism"   // a named law, treaty, institution, or committee to create/change/abolish
  | "specific-stance"   // a clear, checkable position on a named issue, but no number or named mechanism
  | "generic";          // values/aspiration language with no specific, checkable commitment

export type GroundingEntry = {
  text: string;           // verbatim Hebrew quote from the party's source document
  aspect: string;         // canonical sub-dimension id — must be a member of TOPIC_KEY_DIMENSIONS[topicId] (lib/questions.ts)
  sourceUrl: string;      // URL of the original document
  archivePath: string;    // relative path: docs/sources/<partyId>/YYYY-MM-DD-<description>.md
  dateRetrieved: string;  // ISO date (YYYY-MM-DD)
  provenance: Provenance;
  concreteness: Concreteness;
  contrary?: string;      // a position the party explicitly opposes (optional)
  absent?: boolean;       // true = party has no known position on this sub-dimension
};

export type PartyGroundings = {
  platformAvailable: boolean;
  platformLabel?: string;
  sourceUrl?: string;
  archiveDir?: string;
  topics: Record<string, GroundingEntry[]>;
};

// A party's overall source quality is derived from its entries' provenance,
// not hand-maintained — this can't drift out of sync with the actual data.
export function derivePartySourceQuality(pg: PartyGroundings): "official" | "outdated" | "thirdParty" {
  const allEntries = Object.values(pg.topics).flat().filter((e) => !e.absent);
  if (allEntries.some((e) => e.provenance === "official-current")) return "official";
  if (allEntries.some((e) => e.provenance === "official-outdated")) return "outdated";
  return "thirdParty";
}

const PROVENANCE_RANK: Record<Provenance, number> = {
  "official-current": 0, "official-outdated": 1, "joint-list": 2, "third-party": 3,
};
const CONCRETENESS_RANK: Record<Concreteness, number> = {
  quantified: 0, "named-mechanism": 1, "specific-stance": 2, generic: 3,
};

/** Sort entries best-evidence-first: provenance is the primary key, concreteness breaks ties within it. */
export function compareEntryQuality(a: GroundingEntry, b: GroundingEntry): number {
  const p = PROVENANCE_RANK[a.provenance] - PROVENANCE_RANK[b.provenance];
  if (p !== 0) return p;
  return CONCRETENESS_RANK[a.concreteness] - CONCRETENESS_RANK[b.concreteness];
}

export type GroundingsMap = Record<string, PartyGroundings>;

// Repo went public 2026-07-06 — docs/sources/*.md archive links now resolve.
// See risk-review finding 2.2.
export const GROUNDING_ARCHIVE_PUBLIC = true;

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

/**
 * The entries scoring and quoting should actually use for a party+topic:
 * official material (current or outdated) only, falling back to joint-list/
 * third-party sources ONLY when the party has no official material at all
 * for this topic — never as a supplement alongside official material.
 * Sorted best-evidence-first within whichever tier is used.
 */
export function getBestEvidenceForTopic(partyId: string, topicId: string): GroundingEntry[] {
  const entries = getTopicGroundings(partyId, topicId).filter((e) => !e.absent && e.text.length > 0);
  const official = entries.filter(
    (e) => e.provenance === "official-current" || e.provenance === "official-outdated"
  );
  const pool = official.length > 0 ? official : entries;
  return [...pool].sort(compareEntryQuality);
}

/**
 * Picks the next follow-up dimension to probe: the first uncovered key dimension
 * with official grounding evidence from ANY party, falling back to any evidence,
 * falling back to the first uncovered dimension with no evidence at all.
 *
 * Deliberately takes the FULL groundingMap (every party with grounding for the
 * topic), not a pre-filtered subset — scoping this to only "currently close"
 * parties by running score was a real 2026-07-05 bug: a security opener
 * favoring self-reliance made every left-leaning party's genuine, grounded
 * withdrawal/territorial-policy position invisible, because they weren't
 * "close" yet on an unrelated axis. Callers should pass grounding for every
 * party, not a closeness-filtered slice.
 */
export function selectSuggestedDimension(
  uncoveredKeyDims: string[],
  groundingMap: Record<string, GroundingEntry[]>
): string | null {
  const entryLists = Object.values(groundingMap);
  return (
    uncoveredKeyDims.find((dim) =>
      entryLists.some((entries) =>
        entries.some(
          (e) =>
            e.aspect === dim &&
            !e.absent &&
            (e.provenance === "official-current" || e.provenance === "official-outdated")
        )
      )
    ) ??
    uncoveredKeyDims.find((dim) =>
      entryLists.some((entries) => entries.some((e) => e.aspect === dim && !e.absent))
    ) ??
    uncoveredKeyDims[0] ??
    null
  );
}
