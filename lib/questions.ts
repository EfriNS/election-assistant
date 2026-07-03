// ─── Types ────────────────────────────────────────────────────────────────────

export type Option = { id: string; text: string; scores: number[]; hint?: string; term?: string };
export type TopicQ = { question: string; options: Option[]; keyDimensions?: string[] };

// Canonical per-topic aspect taxonomy — this list *is* the fixed enum every
// grounding entry's `aspect` field must be a member of (see data/groundings/*.json
// and the collect-party-data skill). Order = priority for the follow-up API's
// "which sub-dimension to probe next" logic, driven by real party coverage
// (richest first) — NOT by distance from the opener question. A bucket close
// to the opener's core axis but richly grounded still ranks high; the
// follow-up prompt (app/api/follow-up/route.ts) is separately instructed not
// to repeat the opener, which is a live judgment call better made per-turn
// than baked into static ordering. Buckets with 0 current coverage are
// forward-looking (real policy axes with no grounding data yet) and naturally
// sort last since suggestedNextDimension requires evidence to act on.
export const TOPIC_KEY_DIMENSIONS: Record<string, string[]> = {
  security: [
    "territorial-endgame-specifics",         // 7 parties — Jerusalem/annexation/refugees/withdrawal; deeper than opener's abstract "diplomatic solution"
    "military-doctrine",                     // 7 parties — conscription, doctrine, home-front/border enforcement; deeper than opener's abstract "self-reliance"
    "foreign-policy-and-nonproliferation",    // 4 parties — regional normalization, WMD/nuclear
    "hardline-enforcement",                   // 3 parties — internal/border enforcement, death penalty for terrorists
    "accountability-oct7",                    // 2 parties — Oct 7 + general security accountability; opener doesn't touch this at all
    "lebanon-framework-and-hezbollah-disarmament", // 0 parties — forward-looking: reactions to the June 2026 US-brokered Israel-Lebanon framework (conditional IDF withdrawal, Hezbollah disarmament verification, "Yellow Line" security zone). Cross-cutting, not a proxy for territorial-endgame-specifics or the opener's peace/control split — Likud backs the deal while Otzmah Yehudit, Eisenkot, and Bennett/Lapid all oppose it, for different reasons. No current grounding coverage.
  ],
  economy: [
    "social-safety-net-and-labor-protections", // 7 parties — unemployment benefits, EITC, pensions, child allowances, union rights (concrete mechanisms beyond opener's abstract "welfare state")
    "regional-and-sector-development",         // 4 parties — periphery, Arab-sector, olim-targeted development; opener doesn't touch this
    "market-structure-and-competition",        // 3 parties — anti-monopoly, deregulation specifics
    "cost-of-living-and-affordability",        // 3 parties — real, widely-shared axis distinct from the opener's ideological framing
    "fiscal-discipline-and-efficiency",        // 2 parties — gov waste reduction, tax-policy mechanics
  ],
  education: [
    "independent-school-funding-and-autonomy", // 9/10 parties — Haredi/nationalist network funding, core-curriculum compliance
    "core-curriculum-and-teacher-standards",   // 7 parties — curriculum requirements + teacher accountability mechanisms
    "sector-specific-equity",                  // 6 parties — Arab-sector/olim budget parity and access gaps
    "higher-education-and-vocational-training", // 2 parties — tertiary/vocational tracks, distinct life-stage from opener's K-12 framing
  ],
  health: [
    "sector-and-geographic-equity",             // 5 parties — Arab-sector + periphery specifics
    "private-sector-regulation-mechanics",      // 4 parties — concrete private-healthcare regulation mechanisms
    "preventive-care-and-specific-benefits",     // 2 parties — preventive medicine, specific basket items
    "healthcare-workforce-and-professional-licensing", // 0 parties — forward-looking: foreign-doctor recognition, staffing; a real, live Israeli health debate with no current grounding coverage
  ],
  housing: [
    "rental-and-affordability-mechanics",       // 4 parties — rent-subsidy/young-families/public-rental programs
    "sector-and-geographic-equity",              // 3 parties — Arab-sector housing units, Bedouin village recognition, demolitions, periphery incentives
    "service-linked-benefit-mechanics",          // 2 parties — reservist/national-service housing grants
    "settlement-and-territorial-specifics",      // 1 party — green-line, national-land protection specifics
  ],
  religion: [
    "haredi-draft-and-service-burden",           // 7 parties — Haredi draft exemption, equal service burden; opener doesn't touch this at all
    "civil-status-and-public-space-specifics",   // 5 parties — civil marriage recognition, Shabbat commerce specifics
    "rabbinate-monopoly-and-conversion-mechanics", // 4 parties — institutional mechanism specifics
    "national-religious-symbolism",              // 4 parties — Temple Mount, "Jewish state values" specifics
    "minority-religious-autonomy",                // 2 parties — Muslim/Waqf autonomy
  ],
  justice: [
    "judicial-appointments-mechanism-specifics", // 9/10 parties — selection-committee composition, override, term limits; mechanism-level, not the opener's abstract independence-vs-checks framing
    "separation-of-powers-and-democratic-norms", // 6 parties — constitutional structure, press/association freedoms
    "anti-corruption-and-rule-of-law",           // 3 parties — accountability, civil-service integrity; opener doesn't touch this
    "emergency-powers-and-security-law",         // 2 parties — emergency regulations, conscientious objection, citizenship revocation
    "constitutional-and-minority-language-rights", // 1 party — Arabic official-language status, minority constitutional rights
    "international-law-and-accountability",       // 0 parties — forward-looking: ICC/ICJ stance, highly salient post-Oct 7, no current grounding coverage
  ],
  equality: [
    "demographic-and-citizenship-policy",        // 6 parties — national-identity/citizenship-conditionality axis; opener doesn't fully cover this
    "arab-minority-specific-mechanisms",         // 6 parties — municipal budget parity, Druze conscription exemption, institutional quotas
    "gender-equality",                            // 4 parties — opener doesn't touch this at all
    "lgbtq-specific-policy-mechanisms",          // 2 parties — conversion-therapy ban, marriage-recognition specifics
    "disability-and-elderly-inclusion",          // 1 party — opener doesn't touch this at all
  ],
  ecology: [
    "state-responsibility-framing",              // 2 parties — light catch-all; topic stays thin overall
    "local-environmental-enforcement",           // 1 party — water/pollution/sewage infrastructure enforcement
    "international-and-regional-climate-cooperation", // 0 parties — forward-looking: Paris Agreement/EU alignment, no current grounding coverage
  ],
};

// Scores indexed by party order from lib/parties.ts:
//   [hadash, raam, democrats, beyahad, yashar, beitenu, likud, shas, yahadut-hatorah, otzmah-yehudit]
// NOTE: all scores are rough estimates — not verified against current party platforms.
// Expert review required before production use (see TODO #3).

// ─── Formal register (ענייני) ─────────────────────────────────────────────────
// Policy-vocabulary framing: "מה הגישה הנכונה לך?"
// Both registers present the same policy positions per topic; only language differs.

export const QUESTIONS_FORMAL: Record<string, TopicQ> = {
  security: {
    question: "בתחום הביטחון ומדיניות החוץ — מהי הגישה הנכונה מבחינתך?",
    options: [
      {
        id: "control",
        text: "עצמאות ביטחונית — ישראל לא צריכה לסמוך על מדינות אחרות שיגנו עליה או יספקו לה נשק, תחמושת וטכנולוגיה בעיתות משבר; עליה לבנות יכולת הגנה עצמאית משלה, גם אם הדבר כרוך בעלות תקציבית גבוהה",
        scores: [-2, -2, -1, 0, 0, 2, 2, 1, 0, 2],
        term: "יכולת הגנה עצמאית",
        hint: "היכולת להגן על עצמה מבלי להיות תלויה בנשק, תחמושת, מימון או אישור מגורמים חיצוניים. כולל חיזוק התעשייה הביטחונית המקומית (תע\"א, אלביט, רפאל) ורכש עצמאי.",
      },
      {
        id: "peace",
        text: "פתרון מדיני — רק הסדר קבוע עם הפלסטינים יוציא את ישראל מסבבים אינסופיים של מלחמות",
        scores: [2, 2, 2, 0, 0, -1, -2, -1, -1, -2],
        term: "פתרון מדיני",
        hint: "הסדר מדיני — הסכם בין ישראל לרשות הפלסטינית שיסיים את הסכסוך: גבולות, מדינה פלסטינית, ירושלים. כחלופה לממשל צבאי ישראלי מתמשך בשטחים.",
      },
      {
        id: "west",
        text: "ברית מערבית — שמירת תמיכת ארה\"ב ומדינות המערב חיונית לביטחון ישראל לטווח ארוך",
        scores: [1, 0, 2, 2, 1, 0, -1, 0, 0, -2],
        term: "ברית מערבית",
        hint: "הברית עם ארה\"ב כוללת: אספקת נשק, מימון ביטחוני שנתי, וגיבוי בהצבעות באו\"ם. בלי תמיכה זו ישראל תתקשה לממן את צבאה ולהתמודד עם בידוד דיפלומטי.",
      },
    ],
  },
  economy: {
    question: "בכלכלה — מהי לדעתך הדרך העיקרית לשגשוג כלכלי?",
    options: [
      {
        id: "minwage",
        text: "מדינת רווחה — המדינה צריכה לספק רשת ביטחון רחבה: קצבאות, שכר מינימום ושירותים ציבוריים חזקים, גם אם המשמעות היא נטל מס גבוה יותר על כלל האזרחים",
        scores: [2, 2, 2, 0, 0, 0, -1, 2, 2, -1],
        term: "מדינת רווחה",
        hint: "מדינת רווחה — מודל שבו המדינה מממנת רשת שירותים ציבוריים רחבה (בריאות, חינוך, קצבאות, שכר מינימום) באמצעות מיסוי גבוה יחסית על כלל האזרחים, לא רק על העשירים. דוגמה מוכרת: מדינות סקנדינביה. ההפך: מדינה 'רזה' שמשאירה יותר שירותים ואחריות לשוק הפרטי.",
      },
      {
        id: "market",
        text: "שוק חופשי — המדינה כבר מספקת מספיק שירותים, ולעיתים אף יותר מדי; הפחתת מסים ורגולציה תניע צמיחה טובה יותר מהרחבת השירות הציבורי",
        scores: [-1, -1, 0, 1, 2, 2, 2, 0, -1, 2],
      },
      {
        id: "redistrib",
        text: "מיסוי פרוגרסיבי — עשירים ותאגידים משלמים יותר, כדי לצמצם פערים מבנייים",
        scores: [2, 1, 2, 0, -1, 0, -1, 1, 2, -2],
        term: "מיסוי פרוגרסיבי",
        hint: "מיסוי פרוגרסיבי — ככל שמרוויחים יותר (יחידים או תאגידים), אחוז המס גדל. לדוגמה: על ₪10,000 הראשונים משלמים 10%, על ₪50,000 הבאים — 25%, ועל הכנסה מעל ₪80,000 — 50%. ההפך ממיסוי אחיד.",
      },
      {
        id: "growth",
        text: "צמיחה לפני חלוקה מחדש — השקעה בתשתיות, מחקר וטכנולוגיה תגדיל את העוגה לטובת כולם, במקום להתמקד בחלוקה מחדש של הקיים",
        scores: [-2, -1, -2, 1, 2, 2, 2, -2, -2, 2],
      },
    ],
  },
  housing: {
    question: "בדיור — מה הגישה הנכונה מבחינתך?",
    options: [
      {
        id: "public",
        text: "בנייה ציבורית בהיקף גדול — המדינה תבנה עשרות אלפי דירות להשכרה במחיר מפוקח",
        scores: [2, 2, 2, 0, 0, 0, -1, 2, 1, 0],
      },
      {
        id: "market",
        text: "שוק חופשי — הסרת חסמי בנייה ותחרות בין יזמים, שתוריד מחירים",
        scores: [-1, -1, 0, 1, 2, 2, 2, 0, 0, 1],
      },
      {
        id: "settlement",
        text: "התיישבות מעבר לקו הירוק — הרחבת הבנייה ביהודה ושומרון היא חלק מרכזי מפתרון משבר הדיור, לצד פיתוח הנגב והגליל",
        scores: [-2, -2, -2, 1, 1, 1, 2, 1, 1, 2],
        term: "קו הירוק",
        hint: "קו הירוק — הגבול שהיה בין ישראל לירדן לפני מלחמת ששת הימים (1967). יהודה ושומרון (הגדה המערבית) נמצאים מעבר לקו זה; ישראל מחזיקה בהם ומאפשרת בהם בנייה יהודית, אך הם אינם מסופחים רשמית.",
      },
      {
        id: "service",
        text: "עדיפות למשרתים בדיור — מי שתורם באמצעות שירות צבאי או שירות לאומי צריך לקבל עדיפות ומענקים משמעותיים ברכישת דירה",
        scores: [-2, -2, -1, 2, 2, 2, 1, -2, -2, 1],
        term: "שירות לאומי",
        hint: "שירות לאומי — מסלול שירות אזרחי (בדרך כלל שנה–שנתיים), בעיקר עבור מי שפטור משירות צבאי. מאפשר גם למי שלא משרת בצה\"ל לקבל הטבות מבוססות-שירות.",
      },
    ],
  },
  education: {
    question: "בחינוך — מה הכי חשוב לך?",
    options: [
      {
        id: "quality",
        text: "מצוינות בהוראה — שכר וקידום מורים לפי איכות ההוראה ולא רק לפי ותק; משכורות גבוהות יותר למורים טובים",
        scores: [1, 1, 2, 2, 1, 1, 1, 0, 0, 0],
      },
      { id: "equal",   text: "שוויון — כל ילד מקבל אותה הזדמנות, ללא קשר לרקע שלו",       scores: [2, 2, 2, 1, 1, 1, 0, -1, -1, -2] },
      { id: "values",  text: "ערכים — בית ספר שמעביר זהות, מורשת ולאום",                  scores: [-1, 0, 0, 0, 1, 0, 2, 2, 2, 2] },
      {
        id: "skills",
        text: "כישורי חיים — בוגרי בית הספר צריכים לצאת עם יכולות מעשיות: חשיבה ביקורתית, כישורים דיגיטליים ואוריינות פיננסית — לא רק ידע עיוני",
        scores: [1, 1, 1, 2, 2, 2, 1, 0, -2, 0],
      },
    ],
  },
  health: {
    question: "בבריאות — מה הגישה הנכונה מבחינתך?",
    options: [
      {
        id: "basket",
        text: "הרחבת הסל הציבורי — יותר טיפולים ותרופות במימון המדינה, פחות הוצאה מהכיס האישי של האזרח/ית",
        scores: [2, 2, 2, 1, 1, 0, 0, 2, 2, 0],
        term: "הסל הציבורי",
        hint: "סל שירותי הבריאות — רשימת הטיפולים, התרופות והפרוצדורות שקופת החולים מממנת לך ללא תוספת תשלום. ועדה ממשלתית מחליטה אחת לשנה מה להוסיף לסל לפי התקציב הזמין.",
      },
      {
        id: "private",
        text: "הרחבת ביטוחי בריאות משלימים ורפואה פרטית לצד המערכת הציבורית, כפתרון לתורי ההמתנה — גם אם המשמעות היא שחלק מזמן הרופאים יוסט מהמערכת הציבורית לטובת מטופלים משלמים",
        scores: [-2, -1, -2, 0, 0, -1, 2, -1, 0, 0],
        term: "רפואה פרטית משלימה",
        hint: "אפשרות לרכוש כיסוי פרטי/משלים (ניתוח מהיר, רופא מומחה) לצד המערכת הציבורית הקיימת. המחלוקת המרכזית: האם הרחבת השירות הפרטי מקלה על העומס הציבורי, או מסיטה משאבים ותשומת לב רפואית מהמערכת הציבורית (\"רפואה לעשירים\").",
      },
      {
        id: "geography",
        text: "שוויון גיאוגרפי — הבטחת אותה רמת טיפול וזמינות שירותים בנגב ובגליל כמו במרכז הארץ",
        scores: [2, 2, 2, 1, 1, 0, 0, 2, 1, 1],
      },
    ],
  },
  religion: {
    question: "בדת ומדינה — מה הכי חשוב מבחינתך?",
    options: [
      {
        id: "freedom",
        text: "חופש דתי — הפרדת דת ממדינה: החלטות אזרחיות כגון נישואין ותחבורה ציבורית בשבת לא יוכתבו על-ידי מוסדות דתיים",
        scores: [2, 0, 2, 2, 1, 2, 0, -2, -2, -2],
        hint: "לדוגמה: היום רק הרבנות הראשית מוסמכת לערוך גיור יהודי רשמי ונישואין יהודיים, ותחבורה ציבורית מוגבלת בשבת בהתאם למעמד הדתי הקיים. הפרדת דת ומדינה בתחום זה משמעה לאפשר ערוצים חלופיים — גיור פרטי, נישואין אזרחיים — ולפתוח תחבורה ציבורית בשבת.",
      },
      {
        id: "jewish_state",
        text: "זהות יהודית — ישראל כמדינת הלאום היהודי; שמירת האופי הדתי-לאומי היא ערך קיומי",
        scores: [-2, -2, -1, -1, 1, 1, 1, 2, 2, 2],
      },
      {
        id: "equality_all",
        text: "פלורליזם דתי — הכרה שווה בכל הזרמים היהודיים ובאוכלוסיות הלא-יהודיות; אין זרם או קהילה מועדפים",
        scores: [2, 1, 2, 2, 1, 1, -1, -1, -2, -1],
        term: "פלורליזם דתי",
        hint: "פלורליזם דתי — הכרה שווה בכל הזרמים הדתיים ללא היררכיה. בהקשר ישראלי: שוויון בין חרדים, אורתודוקסים, מסורתיים, רפורמים, קונסרבטיבים, ולא-יהודים — בלי שהרבנות האורתודוקסית תהיה הסמכות הדתית הרשמית היחידה.",
      },
    ],
  },
  justice: {
    question: "במערכת המשפט — מה הכי חשוב מבחינתך?",
    options: [
      {
        id: "independence",
        text: "עצמאות — שופטים שלא תלויים בפוליטיקאים שמינו אותם",
        scores: [2, 2, 2, 2, 1, 1, -2, -1, -2, -2],
        term: "עצמאות שיפוטית",
        hint: "עצמאות שיפוטית — עיקרון שלפיו שופטים מחליטים לפי החוק בלבד, ללא לחץ מהממשלה או הכנסת. מונעת מהרוב הפוליטי לשלוט גם בגוף שאמור לפקח עליו.",
      },
      { id: "oversight",    text: "ביקורת — גם בית המשפט צריך גורם שיאזן אותו",                    scores: [-1, -1, -1, -1, 0, 0, 2, 2, 2, 2] },
      { id: "consensus",    text: "יציבות — שינויים משפטיים יתקבלו רק בהסכמה רחבה",                scores: [1, 1, 1, 1, 2, 1, 0, 0, 0, -1] },
      { id: "diversity",    text: "ייצוג — בית המשפט צריך לשקף את כל הציבור הישראלי",              scores: [2, 2, 1, 1, 1, 0, 1, 2, 1, 0] },
    ],
  },
  equality: {
    question: "בזכויות אדם ושוויון — מה הכי חשוב עבורך?",
    options: [
      { id: "law",       text: "חוק ברור — הגנה משפטית מפורשת מפני אפליה",                   scores: [2, 1, 2, 2, 1, 1, 0, -1, -1, -2] },
      { id: "represent", text: "ייצוג — מיעוטים חייבים להיות חלק ממוסדות המדינה",              scores: [2, 2, 2, 1, 1, 0, 0, 0, 1, -2] },
      { id: "character", text: "אופי יהודי — שמירת הרוב היהודי והאופי הלאומי",                 scores: [-2, -2, -1, 0, 1, 1, 2, 2, 2, 2] },
      { id: "lgbtq",     text: "LGBTQ+ — כולם ראויים לחיות בכבוד וללא אפליה",                  scores: [2, -2, 2, 2, 1, 1, -1, -2, -2, -2] },
    ],
  },
  ecology: {
    question: "בסביבה ואנרגיה — מה הגישה העיקרית הנכונה מבחינתך?",
    options: [
      {
        id: "green",
        text: "מחויבות לאקלים — יעדי אנרגיה מתחדשת מחייבים, השקעה ממשלתית ניכרת, ורגולציה סביבתית נוקשה — גם אם יש עלות כלכלית לטווח קצר",
        scores: [2, 1, 2, 1, 1, -1, -1, -1, 0, -2],
        term: "אנרגיה מתחדשת",
        hint: "אנרגיה המיוצרת ממקורות שאינם נגמרים: שמש, רוח, מים. בישראל הפוטנציאל הגדול ביותר הוא סולארי. בניגוד לגז ופחם, אינה פולטת פחמן ואינה תורמת להתחממות הגלובלית.",
      },
      {
        id: "gradual",
        text: "מעבר הדרגתי — יוקר המחיה חשוב יותר מעמידה ביעדי אקלים שאפתניים; לפתח אנרגיה מתחדשת בקצב שלא מייקר את החיים, גם אם זה אומר להגיע ליעדים מאוחר יותר",
        scores: [0, 1, 1, 2, 2, 1, 1, 1, 0, -1],
      },
      {
        id: "independence",
        text: "עצמאות אנרגטית — לשמור את מאגרי הגז הטבעי לצריכה מקומית במקום לייצא אותם, גם אם המשמעות היא ויתור על הכנסות ייצוא; לבחון גם אנרגיה גרעינית כדי לצמצם תלות ביבוא",
        scores: [-2, 0, -1, 0, 1, 2, 2, 0, 0, 2],
        term: "אנרגיה גרעינית",
        hint: "ישראל מפעילה כור מחקר בנחל שורק, אך אין לה תחנות כוח גרעיניות לייצור חשמל. אנרגיה גרעינית אינה פולטת פחמן, אך יקרה לבנייה ומעוררת חששות בטיחות.",
      },
      {
        id: "deregulation",
        text: "פחות רגולציה סביבתית — מס הפחמן, תקני הפליטה ויעדי הפחתת הפליטות מכבידים על עסקים ואזרחים; עדיף להסתמך על השוק וחדשנות טכנולוגית מאשר על חובות רגולטוריות מהמדינה",
        scores: [-2, -1, -2, -2, -1, 0, 2, 1, 1, 2],
        term: "רגולציה סביבתית",
        hint: "רגולציה סביבתית בישראל כוללת, בין היתר: מס הפחמן שאושר ונכנס לתוקף בהדרגה מ-2025 עד 2030 (על פחם, גז טבעי, מזוט וגפ\"מ — לא על דלק לתחבורה), ויעד סגירת תחנות הכוח הפחמיות עד 2026. כחלק מהסכם פריז, ישראל התחייבה לצמצם פליטות ב-27% עד 2030 וב-85% עד 2050 (ביחס ל-2015). מתנגדי הרגולציה טוענים שהיא מייקרת אנרגיה ותוצרת מקומית; תומכיה טוענים שבלעדיה ישראל מפגרת אחרי התחייבויותיה הבינלאומיות.",
      },
    ],
  },
};

// ─── Personal register (זורם) ─────────────────────────────────────────────────
// Same policy positions per topic as the formal register, in plain everyday language.
// Framing: "what direction/approach makes sense to you?" — not "what bothers you."

export const QUESTIONS_PERSONAL: Record<string, TopicQ> = {
  security: {
    question: "בנושא הביטחון ומדיניות החוץ — מה הגישה שנראית לך נכונה?",
    options: [
      {
        id: "control",
        text: "ביטחון עצמאי — אנחנו לא צריכים לסמוך על אף אחד שיגן עלינו או יספק לנו נשק, תחמושת וטכנולוגיה ברגע האמת; צריך לבנות יכולת הגנה עצמאית משלנו, גם אם זה עולה הרבה כסף",
        scores: [-2, -2, -1, 0, 0, 2, 2, 1, 0, 2],
        term: "יכולת הגנה עצמאית",
        hint: "היכולת להגן על עצמה מבלי להיות תלויה בנשק, תחמושת, מימון או אישור מגורמים חיצוניים. כולל חיזוק התעשייה הביטחונית המקומית (תע\"א, אלביט, רפאל) ורכש עצמאי.",
      },
      {
        id: "peace",
        text: "הסדר שלום — בלי הסכם מדיני קבוע עם הפלסטינים, נישאר בלופ הזה לנצח",
        scores: [2, 2, 2, 0, 0, -1, -2, -1, -1, -2],
      },
      {
        id: "west",
        text: "ברית עם המערב — תמיכת ארה\"ב ואירופה היא נכס ביטחוני שאסור לסכן",
        scores: [1, 0, 2, 2, 1, 0, -1, 0, 0, -2],
      },
    ],
  },
  economy: {
    question: "בכלכלה — מה הכיוון הכלכלי שמשכנע אותך?",
    options: [
      {
        id: "minwage",
        text: "מדינת רווחה — המדינה דואגת לרמת חיים בסיסית לכולם: שכר מינימום ראוי, קצבאות, שירותים ציבוריים חזקים — גם אם זה אומר שכולנו משלמים יותר מס",
        scores: [2, 2, 2, 0, 0, 0, -1, 2, 2, -1],
        term: "מדינת רווחה",
        hint: "מדינת רווחה — מדינה שמממנת שירותים ציבוריים רחבים (בריאות, חינוך, קצבאות, שכר מינימום) דרך מיסים גבוהים יחסית על כולם, לא רק על העשירים. דוגמה מוכרת: מדינות סקנדינביה. ההפך: מדינה 'רזה' שמשאירה יותר לשוק הפרטי.",
      },
      {
        id: "market",
        text: "שוק חופשי — המדינה כבר עושה מספיק, אולי אפילו יותר מדי; פחות מסים ופחות רגולציה יביאו צמיחה טובה יותר מעוד שירותים",
        scores: [-1, -1, 0, 1, 2, 2, 2, 0, -1, 2],
      },
      {
        id: "redistrib",
        text: "מיסוי מחדש — עשירים ותאגידים משלמים יותר; הכסף מיועד לשירותים ציבוריים ולצמצום פערים",
        scores: [2, 1, 2, 0, -1, 0, -1, 1, 2, -2],
        term: "מיסוי מחדש",
        hint: "מיסוי מחדש — שינוי במי משלם ובכמה: העלאת מס על הכנסות גבוהות ועל רווחי תאגידים, ושימוש בכסף למימון שירותים ציבוריים. ההפך: מיסוי אחיד שבו כולם משלמים אחוז זהה.",
      },
      {
        id: "growth",
        text: "השקעה לטווח ארוך — תשתיות, מחקר וטכנולוגיה. עדיף לגדל את העוגה מאשר להתעסק בחלוקה מחדש שלה",
        scores: [-2, -1, -2, 1, 2, 2, 2, -2, -2, 2],
      },
    ],
  },
  housing: {
    question: "בנושא דיור — מה הפתרון שנראה לך הגיוני?",
    options: [
      {
        id: "public",
        text: "בנייה ציבורית — המדינה בונה דירות להשכרה במחיר מוזל; הקונים לא תלויים בחסדי היזמים",
        scores: [2, 2, 2, 0, 0, 0, -1, 2, 1, 0],
      },
      {
        id: "market",
        text: "שוק חופשי — הסרת מגבלות בנייה ותחרות בין קבלנים תוריד מחירים",
        scores: [-1, -1, 0, 1, 2, 2, 2, 0, 0, 1],
      },
      {
        id: "settlement",
        text: "לבנות גם מעבר לקו הירוק — יהודה ושומרון הם חלק מהפתרון למצוקת הדיור, לא רק הנגב והגליל",
        scores: [-2, -2, -2, 1, 1, 1, 2, 1, 1, 2],
        term: "קו הירוק",
        hint: "קו הירוק — הגבול שהיה בין ישראל לירדן לפני מלחמת ששת הימים (1967). יהודה ושומרון (הגדה המערבית) נמצאים מעבר לקו זה; ישראל מחזיקה בהם ומאפשרת בהם בנייה יהודית, אך הם אינם מסופחים רשמית.",
      },
      {
        id: "service",
        text: "מי שמשרת, מקבל קודם — מי שנותן לצבא או לשירות הלאומי צריך לקבל עדיפות במענקי דיור",
        scores: [-2, -2, -1, 2, 2, 2, 1, -2, -2, 1],
        term: "שירות לאומי",
        hint: "שירות לאומי — מסלול שירות אזרחי (בדרך כלל שנה–שנתיים), בעיקר עבור מי שפטור משירות צבאי. מאפשר גם למי שלא משרת בצה\"ל לקבל הטבות מבוססות-שירות.",
      },
    ],
  },
  education: {
    question: "בחינוך — מה הגישה שאת/ה מאמין/ה בה?",
    options: [
      {
        id: "quality",
        text: "רמת המורים — מורה טוב שווה יותר מכל תכנית לימודים; לשלם יותר למורים טובים ולקדם אותם לפי מצוינות, לא רק ותק",
        scores: [1, 1, 2, 2, 1, 1, 1, 0, 0, 0],
      },
      {
        id: "equal",
        text: "שוויון הזדמנויות — ילד שגדל בפריפריה או בבית עני לא יתחיל את החיים ממקום יותר נמוך",
        scores: [2, 2, 2, 1, 1, 1, 0, -1, -1, -2],
      },
      {
        id: "values",
        text: "זהות ומורשת — בית הספר צריך להעביר לתלמידים מה זה להיות יהודי, ישראלי",
        scores: [-1, 0, 0, 0, 1, 0, 2, 2, 2, 2],
      },
      {
        id: "skills",
        text: "כישורי חיים — בוגרי תיכון צריכים לצאת עם יכולות אמיתיות: חשיבה ביקורתית, כישורים דיגיטליים, אוריינות פיננסית",
        scores: [1, 1, 1, 2, 2, 2, 1, 0, -2, 0],
      },
    ],
  },
  health: {
    question: "בנושא בריאות — מהו הכיוון הנכון לדעתך?",
    options: [
      {
        id: "basket",
        text: "הרחבת הסל הציבורי — יותר תרופות וטיפולים במימון המדינה; פחות תשלומים מהכיס האישי של האזרח/ית",
        scores: [2, 2, 2, 1, 1, 0, 0, 2, 2, 0],
        term: "הסל הציבורי",
        hint: "סל שירותי הבריאות — רשימת הטיפולים, התרופות והפרוצדורות שקופת החולים מממנת לך ללא תוספת תשלום. ועדה ממשלתית מחליטה אחת לשנה מה להוסיף לסל לפי התקציב הזמין.",
      },
      {
        id: "private",
        text: "הרחבת ביטוחים משלימים ורפואה פרטית לצד הציבורית, כפתרון לתורים הארוכים — גם אם המשמעות היא שחלק מזמן הרופאים עובר למטופלים שמשלמים על זה",
        scores: [-2, -1, -2, 0, 0, -1, 2, -1, 0, 0],
        term: "רפואה פרטית משלימה",
        hint: "אפשרות לרכוש כיסוי פרטי/משלים (ניתוח מהיר, רופא מומחה) לצד המערכת הציבורית הקיימת. המחלוקת המרכזית: האם הרחבת השירות הפרטי מקלה על העומס הציבורי, או מסיטה משאבים ותשומת לב רפואית מהמערכת הציבורית (\"רפואה לעשירים\").",
      },
      {
        id: "geography",
        text: "שוויון גיאוגרפי — אותה רמת טיפול בנגב ובגליל כמו בתל אביב",
        scores: [2, 2, 2, 1, 1, 0, 0, 2, 1, 1],
      },
    ],
  },
  religion: {
    question: "בנושא דת ומדינה — מה עמדתך?",
    options: [
      {
        id: "freedom",
        text: "חופש דתי — כל אחד בוחר כיצד לחיות; המדינה לא אמורה להכתיב לי מה לאכול, איפה אסור לנסוע בשבת, ולמי אני יכול להינשא",
        scores: [2, 0, 2, 2, 1, 2, 0, -2, -2, -2],
        hint: "היום רק הרבנות הראשית יכולה לערוך גיור ונישואין יהודיים רשמיים, והתחבורה הציבורית מוגבלת בשבת. הפרדת דת ומדינה אומרת לפתוח גם ערוצים אחרים — גיור פרטי, נישואין אזרחיים — ותחבורה ציבורית בשבת.",
      },
      {
        id: "jewish_state",
        text: "ישראל יהודית — האופי היהודי הוא מה שמייחד את ישראל; לא ניתן לוותר עליו",
        scores: [-2, -2, -1, -1, 1, 1, 1, 2, 2, 2],
      },
      {
        id: "equality_all",
        text: "שוויון דתי לכולם — כל הזרמים היהודיים: חרדים, אורתודוקסים, מסורתיים, רפורמים, קונסרבטיבים — לצד מוסלמים, נוצרים ודרוזים — כולם ראויים להכרה מלאה ולשוויון זכויות",
        scores: [2, 1, 2, 2, 1, 1, -1, -1, -2, -1],
      },
    ],
  },
  justice: {
    question: "לגבי שלטון החוק — מה הגישה שמשכנעת אותך?",
    options: [
      {
        id: "independence",
        text: "עצמאות שיפוטית — בית המשפט חייב להיות עצמאי מהממשלה; ללא עצמאות שיפוטית, אין הגנה לאזרח מפני ריכוז כוח",
        scores: [2, 2, 2, 2, 1, 1, -2, -1, -2, -2],
        term: "עצמאות שיפוטית",
        hint: "עצמאות שיפוטית — שופטים מחליטים לפי החוק בלבד, לא לפי הוראות הממשלה. ההפך: מצב שבו הרוב הפוליטי יכול ללחוץ על בית המשפט או למנות שופטים נאמנים לו.",
      },
      {
        id: "oversight",
        text: "ריסון שיפוטי — לשופטים שלא נבחרים על ידי הציבור יש יותר מדי כוח; החלטות חברתיות משמעותיות שייכות לנבחרי הציבור",
        scores: [-1, -1, -1, -1, 0, 0, 2, 2, 2, 2],
        term: "ריסון שיפוטי",
        hint: "ריסון שיפוטי — עמדה שלפיה בית המשפט צריך להתערב פחות בהחלטות הממשלה והכנסת, ולהשאיר יותר סמכות לנבחרי הציבור. ההפך מ'אקטיביזם שיפוטי' שבו בית המשפט מבטל חקיקת כנסת.",
      },
      {
        id: "consensus",
        text: "הסכמה לאומית — שינוי מבני בשיטת המשפט חייב לעבור בתמיכה רחבה, לא ברוב קואליציוני מינימלי",
        scores: [1, 1, 1, 1, 2, 1, 0, 0, 0, -1],
      },
      {
        id: "diversity",
        text: "ייצוג — בית המשפט צריך לשקף את כל החברה הישראלית, לא רק מעגל חברתי מצומצם",
        scores: [2, 2, 1, 1, 1, 0, 1, 2, 1, 0],
      },
    ],
  },
  equality: {
    question: "בנושא זכויות ושוויון — מה הגישה הנכונה לדעתך?",
    options: [
      {
        id: "law",
        text: "הגנה משפטית — חייב להיות חוק ברור שאוסר אפליה — בשוק העבודה, בדיור, בשירות הציבורי",
        scores: [2, 1, 2, 2, 1, 1, 0, -1, -1, -2],
      },
      {
        id: "represent",
        text: "ייצוג מוסדי — מיעוטים חייבים להיות חלק אמיתי ממוסדות המדינה, לא נשכחים בצד",
        scores: [2, 2, 2, 1, 1, 0, 0, 0, 1, -2],
        term: "ייצוג מוסדי",
        hint: "ייצוג מוסדי — נוכחות אמיתית של מיעוטים (ערבים, אתיופים, חרדים, נשים) במוסדות המדינה עצמם: ממשלה, כנסת, צבא, שירות מדינה, בתי משפט. לא רק הגנה משפטית, אלא ישיבה בשולחן ההחלטות.",
      },
      {
        id: "character",
        text: "ישראל יהודית — שמירה על אופייה היהודי של המדינה היא ערך שיש להגן עליו",
        scores: [-2, -2, -1, 0, 1, 1, 2, 2, 2, 2],
      },
      {
        id: "lgbtq",
        text: "זכויות LGBTQ+ — כל אחד ראוי לחיות בכבוד ובשוויון — נישואין, אימוץ, הגנה מאפליה",
        scores: [2, -2, 2, 2, 1, 1, -1, -2, -2, -2],
      },
    ],
  },
  ecology: {
    question: "בנושא סביבה ואנרגיה — מה הגישה שנראית לך נכונה?",
    options: [
      {
        id: "green",
        text: "מחויבות ירוקה — המדינה צריכה להוביל: יעדי אנרגיה מתחדשת, פחות זיהום, תחבורה ציבורית — גם אם זה עולה יותר כסף בטווח הקצר",
        scores: [2, 1, 2, 1, 1, -1, -1, -1, 0, -2],
        term: "אנרגיה מתחדשת",
        hint: "אנרגיה המיוצרת ממקורות שאינם נגמרים: שמש, רוח, מים. בישראל הפוטנציאל הגדול ביותר הוא סולארי. בניגוד לגז ופחם, אינה פולטת פחמן ואינה תורמת להתחממות הגלובלית.",
      },
      {
        id: "gradual",
        text: "מעבר בקצב סביר — יוקר המחיה חשוב יותר מלעמוד ביעדי אקלים שאפתניים; לפתח אנרגיה ירוקה בלי לייקר לנו את החשמל והדלק, גם אם זה ייקח יותר זמן",
        scores: [0, 1, 1, 2, 2, 1, 1, 1, 0, -1],
      },
      {
        id: "independence",
        text: "עצמאות אנרגטית — הגז הטבעי שלנו נשאר אצלנו ולא לייצוא, גם אם זה אומר לוותר על הכנסות; אפשר לבחון אנרגיה גרעינית כדי לא להיות תלויים ביבוא",
        scores: [-2, 0, -1, 0, 1, 2, 2, 0, 0, 2],
        term: "אנרגיה גרעינית",
        hint: "ישראל מפעילה כור מחקר בנחל שורק, אך אין לה תחנות כוח גרעיניות לייצור חשמל. אנרגיה גרעינית אינה פולטת פחמן, אך יקרה לבנייה ומעוררת חששות בטיחות.",
      },
      {
        id: "deregulation",
        text: "פחות רגולציה סביבתית — מס הפחמן, תקני הפליטה ויעדי הפחתת הפליטות מכבידים על עסקים ועל הכיס של האזרח; עדיף לסמוך על השוק ועל טכנולוגיה מאשר על חובות מהמדינה",
        scores: [-2, -1, -2, -2, -1, 0, 2, 1, 1, 2],
        term: "רגולציה סביבתית",
        hint: "רגולציה סביבתית בישראל כוללת, בין היתר: מס הפחמן שאושר ונכנס לתוקף בהדרגה מ-2025 עד 2030 (על פחם, גז טבעי, מזוט וגפ\"מ — לא על דלק לתחבורה), ויעד סגירת תחנות הכוח הפחמיות עד 2026. כחלק מהסכם פריז, ישראל התחייבה לצמצם פליטות ב-27% עד 2030 וב-85% עד 2050 (ביחס ל-2015). מתנגדי הרגולציה טוענים שהיא מייקרת אנרגיה ותוצרת מקומית; תומכיה טוענים שבלעדיה ישראל מפגרת אחרי התחייבויותיה הבינלאומיות.",
      },
    ],
  },
};
