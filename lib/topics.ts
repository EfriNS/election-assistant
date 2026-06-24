// Canonical topic list shared by PrioritiesStep, questions, groundings, and API routes.
// Order here drives the display order in PrioritiesStep.

export type Topic = { id: string; label: string };

export const TOPICS: Topic[] = [
  { id: "security",  label: "ביטחון ומדיניות חוץ" },
  { id: "economy",   label: "כלכלה ותעסוקה" },
  { id: "housing",   label: "דיור ועלות מחיה" },
  { id: "education", label: "חינוך" },
  { id: "health",    label: "בריאות" },
  { id: "religion",  label: "דת ומדינה" },
  { id: "justice",   label: "שלטון החוק ומערכת המשפט" },
  { id: "equality",  label: "זכויות אדם ומיעוטים" },
  { id: "ecology",   label: "סביבה ואנרגיה" },
];

export const TOPIC_LABELS: Record<string, string> = Object.fromEntries(
  TOPICS.map((t) => [t.id, t.label])
);
