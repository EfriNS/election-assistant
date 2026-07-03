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
  subtitle?: string;    // shown in parentheses — use for lesser-known names, e.g. "בנט/לפיד"
  description: string;  // one-line tagline shown in results
  website: string;      // general party homepage (empty string if unknown)
  platformUrl?: string; // URL to official מצע or closest available substitute
  platformLabel?: string; // overrides "מצע רשמי" label — use when URL is NOT a real מצע (e.g. "יעדים (לא מצע)")
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
    platformUrl: "https://hadash.org.il/#values",
    platformLabel: 'עקרונות חד"ש',
  },
  {
    id: "raam",
    name: 'רע"ם',
    subtitle: "עבאס",
    description: "מפלגה אסלאמית ערבית — זכויות אזרחים ערבים, סגירת פערים כלכליים, שתי מדינות.",
    website: "",
  },
  {
    id: "democrats",
    name: "הדמוקרטים",
    description: "מרכז-שמאל — מדינת רווחה, שוויון חברתי, ושאיפה להסדר מדיני.",
    website: "https://democrats.org.il",
    platformUrl: "https://yes.democrats.org.il",
    platformLabel: "התחייבויות 2026",
  },
  {
    id: "beyahad",
    name: "ביחד",
    subtitle: "בנט / לפיד",
    description: "מרכז — ממשל נקי, חינוך, הפרדת דת ומדינה.",
    website: "https://bennett2026.org.il/",
    platformUrl: "https://bennett2026.org.il/plans/",
    platformLabel: "תכניות ביחד",
  },
  {
    id: "yashar",
    name: "ישר!",
    subtitle: "איזנקוט",
    description: "מרכז-ימין — ביטחון לאומי, שקיפות, ממשל אחראי.",
    website: "https://yasharwitheisenkot.com",
    platformUrl: "https://yasharwitheisenkot.com/agenda_point/",
    platformLabel: "10 הצעדים (יוני 2026)",
  },
  {
    id: "beitenu",
    name: "ישראל ביתנו",
    description: "ימין חילוני — הפרדת דת ומדינה לצד עמדות ביטחוניות נוקשות.",
    website: "https://beytenu.org.il",
    platformUrl: "https://beytenu.org.il/party-platform/",
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
    website: "", // shas.org.il: ECONNREFUSED live + Wayback last snapshot Nov 2022 — dead, not transient.
                 // shasnet.org.il (previous value here) is an unrelated senior-housing directory — not the party at all.
  },
  {
    id: "yahadut-hatorah",
    name: "יהדות התורה",
    description: "ימין חרדי אשכנזי — פטור מגיוס, חינוך תורני, מונופול הרבנות.",
    website: "",
  },
  {
    id: "otzmah-yehudit",
    name: "עוצמה יהודית",
    subtitle: "בן גביר",
    description: "ימין קיצוני לאומי-דתי — ריבונות מהנהר לים, 'קפיטליזם יהודי', הוצאת אויבים.",
    website: "https://ozma-yeudit.co.il",
    platformUrl: "https://ozma-yeudit.co.il/מי-אנחנו/",
    platformLabel: "מי אנחנו",
  },
];
