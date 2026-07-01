// Shared types for the grounding evidence returned from /api/results.
// Used by both UnifiedResultsPage and PartyResultCard.

export type GroundingEntryLite = {
  text: string;
  aspect: string;
  sourceUrl: string;
  dateRetrieved: string;
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
