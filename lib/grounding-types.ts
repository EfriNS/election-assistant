// Shared types for the grounding evidence returned from /api/results.
// Used by both UnifiedResultsPage and PartyResultCard.

import type { Provenance } from "./groundings";

// Quotes shown per topic before "show all" — a party with a full platform has
// up to ~30 on one topic. Shared by the results card and the PDF export.
export const QUOTES_SHOWN_PER_TOPIC = 2;

export type GroundingEntryLite = {
  text: string;
  aspect: string;
  sourceUrl: string;
  archivePath: string;
  dateRetrieved: string;
  provenance: Provenance;
  contrary?: string;
  // True when this entry's aspect was the one probed by a follow-up question.
  matched?: boolean;
};

export type TopicGroundingResult = {
  topicId: string;
  topicLabel: string;
  entries: GroundingEntryLite[];
};

export type PartyGroundingResult = {
  platformAvailable: boolean;
  platformLabel?: string;
  sourceQuality?: "official" | "thirdParty" | "outdated";
  topics: TopicGroundingResult[];
};
