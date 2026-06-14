// Source of truth for real Israeli party metadata.
// Update this file when parties change names, merge, or update their platforms.
//
// platformUrl: URL to the party's official platform/manifesto page (NOT just their homepage).
// Leave undefined if no public platform page exists — this is shown explicitly in results.
//
// SCORING NOTE: Party positions in each prototype are rough estimates based on known public
// positions. They have NOT been verified against official current party platforms.
// New parties (ביחד, ישר!) are scored based on their founders' known positions.

export type Party = {
  id: string;
  name: string;
  subtitle?: string;   // shown in parentheses — use for lesser-known names, e.g. "בנט/לפיד"
  description: string; // one-line tagline shown in results
  website: string;     // general party homepage (empty string if unknown)
  platformUrl?: string; // specific platform/manifesto page, if it exists
};

// Ordered left→right on the general political spectrum.
// Scoring arrays in each prototype must follow this same order.
// Last updated: June 2026 (based on user corrections)
export const PARTIES: Party[] = [
  {
    id: "hadash",
    name: 'חד"ש-תע"ל',
    description: "שמאל יהודי-ערבי — שלום, שוויון אזרחי, זכויות עובדים ורפואה ציבורית.",
    website: "https://hadash.org.il",
  },
  {
    id: "democrats",
    name: "הדמוקרטים",
    description: "מרכז-שמאל — מדינת רווחה, שוויון חברתי, ושאיפה להסדר מדיני.",
    website: "https://democrats.org.il",
  },
  {
    id: "beyahad",
    name: "ביחד",
    subtitle: "בנט / לפיד",
    description: "מרכז — ממשל נקי, חינוך, הפרדת דת ומדינה.",
    website: "", // verify current URL
  },
  {
    id: "yashar",
    name: "ישר!",
    subtitle: "איזנקוט",
    description: "מרכז-ימין — ביטחון לאומי, שקיפות, ממשל אחראי.",
    website: "", // verify current URL
  },
  {
    id: "beitenu",
    name: "ישראל ביתנו",
    description: "ימין חילוני — הפרדת דת ומדינה לצד עמדות ביטחוניות נוקשות.",
    website: "https://beytenu.org.il",
  },
  {
    id: "likud",
    name: "ליכוד",
    description: "ימין לאומי — ביטחון חזק, כלכלת שוק, שמרנות חברתית.",
    website: "https://likud.org.il",
  },
  {
    id: "shas",
    name: 'ש"ס',
    description: "ימין דתי-ספרדי — ערכים מסורתיים, דאגה לשכבות חלשות.",
    website: "https://shasnet.org.il",
  },
];
