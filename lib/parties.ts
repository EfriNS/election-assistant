// Source of truth for real Israeli party metadata.
// Update this file when parties change names, merge, or update their platforms.

export type Party = {
  id: string;
  name: string;
  description: string; // one-line tagline shown in results
  website: string;
};

// Ordered left→right on the general political spectrum.
// Scoring arrays in each prototype must follow this same order.
export const PARTIES: Party[] = [
  {
    id: "hadash",
    name: 'חד"ש-תע"ל',
    description: "שמאל יהודי-ערבי — שלום, שוויון אזרחי, זכויות עובדים ורפואה ציבורית.",
    website: "https://hadash.org.il",
  },
  {
    id: "labor",
    name: "העבודה",
    description: "מרכז-שמאל — מדינת רווחה, שוויון חברתי, ושאיפה להסדר מדיני.",
    website: "https://havoda.org.il",
  },
  {
    id: "yeshatid",
    name: "יש עתיד",
    description: "מרכז חילוני — ממשל נקי, חינוך, הפרדת דת ומדינה.",
    website: "https://yeshatid.org.il",
  },
  {
    id: "unity",
    name: "המחנה הממלכתי",
    description: "מרכז-ימין — ביטחון לאומי, אחדות לאומית, ממשל אחראי.",
    website: "https://machanemamlachti.co.il",
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
