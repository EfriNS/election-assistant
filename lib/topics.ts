// Canonical topic list shared by PrioritiesStep, questions, groundings, and API routes.
// Order here drives the display order in PrioritiesStep.

export type Topic = { id: string; label: string };

export const TOPICS: Topic[] = [
  { id: "security",  label: "ביטחון ומדיניות חוץ" },
  { id: "justice",   label: "שלטון החוק ומערכת המשפט" },
  { id: "economy",   label: "כלכלה ותעסוקה" },
  { id: "housing",   label: "דיור ועלות מחיה" },
  { id: "education", label: "חינוך" },
  { id: "health",    label: "בריאות" },
  { id: "religion",  label: "דת ומדינה" },
  { id: "equality",  label: "זכויות אדם ומיעוטים" },
  { id: "ecology",   label: "סביבה ואנרגיה" },
];

export const TOPIC_LABELS: Record<string, string> = Object.fromEntries(
  TOPICS.map((t) => [t.id, t.label])
);

// Shared with PrioritiesStep (cap enforcement) and lib/scoring.ts (gate check) —
// one source of truth so the two stay in sync.
export const CRITICAL_WEIGHT = 4;      // the "קריטי" bucket value
export const MAX_CRITICAL_TOPICS = 2;  // cap enforced in PrioritiesStep
