// Generates the full HTML document for PDF export — plain string builder, no React.
// This avoids Next.js/Turbopack restrictions on react-dom/server in route handlers.

import type { Party } from "@/lib/parties";
import type { PartyGroundingResult } from "@/lib/grounding-types";
import { TOPIC_LABELS, MAX_CRITICAL_TOPICS } from "@/lib/topics";
import { GROUNDING_ARCHIVE_PUBLIC } from "@/lib/groundings";
import { GATE_SCORE_CAP } from "@/lib/scoring";
import { formatHebrewDate } from "@/lib/formatDate";

const ARCHIVE_BASE_URL = "https://github.com/EfriNS/election-assistant/blob/main/";

export type PdfResultsData = {
  results: Array<Party & { score: number; rawScore?: number; criticalConflicts?: string[] }>;
  aiProfile?: string;
  partyBlurbs?: Record<string, string>;
  groundings?: Record<string, PartyGroundingResult>;
  topicScores?: Record<string, Record<string, number>>;
  answeredTopicIds?: string[];
  topicAnswerTexts?: Record<string, string>;
  accentColor: "blue" | "emerald" | "amber" | "purple" | "teal";
  quotaExceeded?: boolean;
};

const ACCENT_COLORS = {
  blue:    { highlight: "bg-blue-50 border-blue-300",       bar: "bg-blue-400",    score: "text-blue-700",    link: "text-blue-500"   },
  emerald: { highlight: "bg-emerald-50 border-emerald-300", bar: "bg-emerald-400", score: "text-emerald-700", link: "text-emerald-600" },
  amber:   { highlight: "bg-amber-50 border-amber-300",     bar: "bg-amber-400",   score: "text-amber-700",   link: "text-amber-600"  },
  purple:  { highlight: "bg-purple-50 border-purple-300",   bar: "bg-purple-400",  score: "text-purple-700",  link: "text-purple-600" },
  teal:    { highlight: "bg-teal-50 border-teal-300",       bar: "bg-teal-400",    score: "text-teal-700",    link: "text-teal-600"   },
};

// ─── HTML escape ──────────────────────────────────────────────────────────────

function e(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Sub-renderers ────────────────────────────────────────────────────────────

function renderChips(
  answeredTopicIds: string[],
  partyTopicScores: Record<string, number> | undefined
): string {
  if (!partyTopicScores) return "";
  return answeredTopicIds
    .map((topicId) => {
      const pct = partyTopicScores[topicId];
      const shortLabel = e(TOPIC_LABELS[topicId]?.split(" ")[0] ?? topicId);
      if (pct === undefined) {
        return `<span class="px-1.5 py-0.5 rounded border text-xs leading-none bg-gray-50 border-gray-200 text-gray-300">${shortLabel} —</span>`;
      }
      const cls =
        pct >= 60
          ? "bg-green-50 border-green-200 text-green-700"
          : pct < 40
          ? "bg-red-50 border-red-200 text-red-600"
          : "bg-gray-50 border-gray-200 text-gray-400";
      const symbol = pct >= 60 ? "v" : pct < 40 ? "x" : "~";
      return `<span class="px-1.5 py-0.5 rounded border text-xs leading-none ${cls}">${shortLabel} ${symbol} ${pct}%</span>`;
    })
    .join("\n");
}

function renderGrounding(
  groundingData: PartyGroundingResult,
  sourceLinkLabel: string,
  topicAnswerTexts: Record<string, string> | undefined,
  criticalConflicts: string[] | undefined
): string {
  const lastVerified = groundingData.topics
    .flatMap((tg) => tg.entries.map((entry) => entry.dateRetrieved))
    .sort()
    .at(-1);
  const lastVerifiedHtml = lastVerified
    ? `<p class="text-xs text-gray-400 mb-1">מקורות עודכנו לאחרונה: ${e(formatHebrewDate(lastVerified))}</p>`
    : "";

  const outdatedWarning =
    groundingData.platformAvailable === false
      ? `<div class="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 leading-relaxed">
          <span class="font-semibold">המפלגה לא פרסמה מצע בחירות עדכני.</span>
          ציטוטים אלה מבוססים על מסמכים ישנים ועלולים שלא לשקף את עמדותיה הנוכחיות.
        </div>`
      : "";

  // Critical-topic conflicts sort first and get a highlight — same reordering
  // rule as PartyResultCard's accordion.
  const sortedTopics = [...groundingData.topics].sort((a, b) => {
    const aGated = criticalConflicts?.includes(a.topicId) ? 0 : 1;
    const bGated = criticalConflicts?.includes(b.topicId) ? 0 : 1;
    return aGated - bGated;
  });

  const topics = sortedTopics
    .map((tg) => {
      const isGateTopic = criticalConflicts?.includes(tg.topicId);
      const userAnswer = topicAnswerTexts?.[tg.topicId];
      const userAnswerHtml = userAnswer
        ? `<p class="text-xs text-gray-400 italic mb-1.5 border-r-2 border-teal-200 pr-2">ענית: ${e(userAnswer)}</p>`
        : "";
      const gateLabelHtml = isGateTopic
        ? `<p class="text-xs font-semibold text-red-600 mb-1">נושא קריטי שגרם להגבלת הציון</p>`
        : "";

      const entries = tg.entries
        .map(
          (entry) => `
          <div class="border-r-2 pr-3 ${entry.matched ? "border-teal-300" : "border-gray-200"}">
            ${entry.matched ? `<p class="text-xs text-teal-500 font-medium mb-0.5">↳ קשור לשאלת ההמשך שענית עליה</p>` : ""}
            ${entry.contrary ? `<p class="text-xs text-red-400 font-medium mb-0.5">המפלגה מתנגדת ל: ${e(entry.contrary)}</p>` : ""}
            <p class="text-xs text-gray-700 leading-relaxed">&ldquo;${e(entry.text)}&rdquo;</p>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
              <a href="${e(entry.sourceUrl)}" class="text-xs text-gray-400">מקור — ${e(sourceLinkLabel)}</a>
              ${GROUNDING_ARCHIVE_PUBLIC ? `<a href="${e(ARCHIVE_BASE_URL + entry.archivePath)}" class="text-xs text-gray-400">ארכיון</a>` : ""}
              <span class="text-xs text-gray-400">${e(formatHebrewDate(entry.dateRetrieved))}</span>
            </div>
          </div>`
        )
        .join("\n");

      return `
        <div class="break-inside-avoid${isGateTopic ? " bg-red-50 border border-red-200 rounded-lg p-2" : ""}">
          ${gateLabelHtml}
          <p class="text-xs font-semibold ${isGateTopic ? "text-red-700" : "text-gray-600"} mb-1 uppercase tracking-wide">${e(tg.topicLabel)}</p>
          ${userAnswerHtml}
          <p class="text-xs text-gray-400 mb-1">עמדת המפלגה במסמכיה:</p>
          <div class="space-y-2">${entries}</div>
        </div>`;
    })
    .join("\n");

  return `
    <div class="mt-2 border-t border-gray-100 pt-2 space-y-4">
      ${lastVerifiedHtml}
      ${outdatedWarning}
      ${topics}
    </div>`;
}

function renderPartyCard(
  party: Party & { score: number; rawScore?: number; criticalConflicts?: string[] },
  rank: number,
  accentColor: keyof typeof ACCENT_COLORS,
  aiBlurb: string | undefined,
  groundingData: PartyGroundingResult | undefined,
  topicAnswerTexts: Record<string, string> | undefined,
  partyTopicScores: Record<string, number> | undefined,
  answeredTopicIds: string[] | undefined
): string {
  const c = ACCENT_COLORS[accentColor];
  const isTop = rank === 0;
  const hasGrounding = (groundingData?.topics?.length ?? 0) > 0;
  const sourceQuality = groundingData?.sourceQuality;
  const isLowQualitySource = sourceQuality === "thirdParty" || sourceQuality === "outdated";
  const sourceLinkLabel =
    sourceQuality === "official"
      ? (party.platformLabel ?? "מצע רשמי")
      : sourceQuality === "outdated"
      ? "מסמך ישן"
      : sourceQuality === "thirdParty"
      ? "מקור חיצוני"
      : (party.platformLabel ?? "מקור");

  const cardClass = isTop
    ? `border-2 ${c.highlight}`
    : "bg-white border border-gray-200";

  const chips =
    answeredTopicIds && partyTopicScores
      ? `<div class="flex flex-wrap gap-1 mb-3">${renderChips(answeredTopicIds, partyTopicScores)}</div>`
      : "";

  const conflictBanner =
    party.criticalConflicts && party.criticalConflicts.length > 0
      ? `<div class="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 leading-relaxed mb-2">
          <span class="font-semibold">מתנגשת עם עדיפות שסימנת כקריטית: </span>
          ${e(party.criticalConflicts.map((id) => TOPIC_LABELS[id]).join(", "))}.
          ${party.rawScore !== undefined && party.rawScore !== party.score
            ? `<span class="text-red-400"> ציון ההתאמה הכולל מוגבל בגלל זה (לפני ההגבלה: ${party.rawScore}%).</span>`
            : ""}
        </div>`
      : "";

  const aiBlurbHtml = aiBlurb
    ? `<div class="mt-1 mb-2 pt-2 border-t border-gray-100">
        <p class="text-xs text-gray-500 leading-relaxed">
          ${e(aiBlurb)}
        </p>
      </div>`
    : "";

  let platformLinkHtml: string;
  if (party.platformUrl && !isLowQualitySource) {
    platformLinkHtml = `<a href="${e(party.platformUrl)}" class="text-xs ${c.link}">${e(party.platformLabel ?? "מצע רשמי")}</a>`;
  } else if (isLowQualitySource) {
    platformLinkHtml = `<span class="text-xs text-red-400 font-medium">${sourceQuality === "outdated" ? "מקורות מיושנים" : "מקורות חיצוניים"}</span>`;
  } else if (hasGrounding) {
    platformLinkHtml = `<span class="text-xs text-amber-500">ללא מצע רשמי</span>`;
  } else {
    platformLinkHtml = `<span class="text-xs text-red-400 font-medium">אין מצע מפורסם</span>`;
  }

  const groundingHtml =
    hasGrounding && groundingData
      ? renderGrounding(groundingData, sourceLinkLabel, topicAnswerTexts, party.criticalConflicts)
      : "";

  return `
    <div class="rounded-xl p-4 ${cardClass}">
      <div class="break-inside-avoid">
        <div class="flex justify-between items-center mb-2">
          <div>
            <span class="font-semibold">${rank + 1}. ${e(party.name)}</span>
            ${party.subtitle ? `<span class="text-xs text-gray-400 mr-2">(${e(party.subtitle)})</span>` : ""}
          </div>
          <span class="font-bold ${c.score}">${party.score}%</span>
        </div>
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div class="h-full ${c.bar} rounded-full" style="width: ${party.score}%"></div>
        </div>
        ${conflictBanner}
        ${chips}
        <p class="text-xs text-gray-500 mb-2">${e(party.description)}</p>
        ${aiBlurbHtml}
      </div>
      <div class="flex gap-4 flex-wrap items-center mb-2">
        ${party.website
          ? `<a href="${e(party.website)}" class="text-xs ${c.link}">אתר המפלגה</a>`
          : `<span class="text-xs text-gray-500">אתר לא ידוע</span>`}
        ${platformLinkHtml}
      </div>
      ${groundingHtml}
    </div>`;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildPdfHtml(data: PdfResultsData, generatedAt: string): string {
  const {
    results, aiProfile, partyBlurbs, groundings, topicScores,
    answeredTopicIds, topicAnswerTexts, accentColor, quotaExceeded,
  } = data;

  const top1 = results[0]?.score ?? 0;
  const lastCloseIdx = results.reduce(
    (last, r, i) => (i < 3 || r.score >= top1 - 15 ? i : last),
    0
  );
  const showSeparator = lastCloseIdx < results.length - 1;
  const isClose = results.length >= 3 && top1 - results[2].score <= 12;

  const quotaNotice = quotaExceeded
    ? `<div class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 leading-relaxed">
        בשל עומס גבוה, ניתוח ה-AI אינו זמין כרגע. ציוני ההתאמה מבוססים על המצעים ומוצגים במלואם.
      </div>`
    : "";

  const profileBox = aiProfile
    ? `<div class="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-start gap-2">
        <p class="text-sm text-indigo-900 leading-relaxed">${e(aiProfile)}</p>
      </div>`
    : "";

  const closeNotice = isClose
    ? `<div class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 leading-relaxed">
        <span class="font-medium text-gray-600">שלוש המפלגות המובילות קרובות בציון</span>
        (${results[2].score}%–${top1}%).
        הפרש קטן אינו מכריע — הסתכלו על הנושאים (✓ / ~ / ✕) כדי לראות היכן המפלגות נבדלות.
      </div>`
    : "";

  const cards = results
    .map((r, i) => {
      const card = renderPartyCard(
        r, i, accentColor,
        partyBlurbs?.[r.id],
        groundings?.[r.id],
        topicAnswerTexts,
        topicScores?.[r.id],
        answeredTopicIds
      );
      const separator =
        showSeparator && i === lastCloseIdx
          ? `<div class="flex items-center gap-3 mt-3 mb-1">
              <div class="flex-1 h-px bg-gray-200"></div>
              <span class="text-xs text-gray-300 whitespace-nowrap">שאר המפלגות</span>
              <div class="flex-1 h-px bg-gray-200"></div>
            </div>`
          : "";
      return card + separator;
    })
    .join("\n");

  const methodology = `
    <div class="bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 leading-relaxed mt-6 break-inside-avoid">
      <div class="px-4 py-3 border-b border-gray-200">
        <strong class="text-gray-600">שיטת החישוב: </strong>
        ציוני ההתאמה מבוססים על ציטוטים ממצעי המפלגות — המקורות מקושרים בכרטיסיות למטה.
      </div>
      <div class="px-4 py-4 space-y-3">
        <div>
          <strong class="text-gray-600">ציון לנושא: 2− עד 2+</strong>
          <p class="mt-1">לכל תשובה לשאלת הפתיחה יש ציון מוגדר מראש לכל מפלגה: 2+ (התאמה מלאה), 1+ (התאמה חלקית), 0 (ניטרלי), 1− (חוסר התאמה חלקי), 2− (עמדה מנוגדת). הציונים נגזרים מציטוטים ישירים מהמצעים הרשמיים.</p>
        </div>
        <div>
          <strong class="text-gray-600">שאלות המשך שמייצר ה-AI</strong>
          <p class="mt-1">לאחר כל תשובה, ה-AI מייצר שאלות המשך ממוקדות בהתבסס על תשובתך — במטרה להבחין בין מפלגות ״שכנות״ אידיאולוגית שציון הפתיחה לא מפריד ביניהן. תשובות אלה מנותחות מול ציטוטים מהמצעים, ומשקלן שווה לשאלת הפתיחה (50/50).</p>
        </div>
        <div>
          <strong class="text-gray-600">משקל העדיפויות</strong>
          <p class="mt-1">נושא שסימנת כ״קריטי״ תורם פי-4 לציון הסופי לעומת ״פחות חשוב״ (יחס 4:3:2:1). כך נושאים שחשובים לך באמת שולטים בתוצאה. ניתן לסמן עד ${MAX_CRITICAL_TOPICS} נושאים כ״קריטי״ — כדי לשמור על המשמעות שלו.</p>
        </div>
        <div>
          <strong class="text-gray-600">התנגשות עם עדיפות קריטית</strong>
          <p class="mt-1">אם מפלגה מתנגדת לעמדתך בנושא שסימנת כ״קריטי״, ציון ההתאמה הכולל שלה מוגבל לכל היותר ל-${GATE_SCORE_CAP}%, גם אם היא מסכימה איתך ברוב שאר הנושאים. כרטיסיית המפלגה מציינת מפורשות כשזה קורה.</p>
        </div>
        <div>
          <strong class="text-gray-600">ציון סופי</strong>
          <p class="mt-1">ממוצע משוקלל של כל הנושאים שענית עליהם, מנורמל ל-0–100%. הציון אינו ליניארי — אי-התאמה בנושא אחד גורמת לירידה גדולה יותר ממה שהסכמה על נושא אחר תפצה עליה.</p>
        </div>
      </div>
    </div>`;

  const body = `
    <div class="max-w-2xl mx-auto space-y-4 text-gray-900">
      <div class="border-b border-gray-200 pb-4 mb-2 flex items-start justify-between">
        <div>
          <h1 class="text-xl font-bold">עוזר הבחירות</h1>
          <p class="text-sm text-gray-500 mt-0.5">תוצאות ההתאמה האישית שלך</p>
        </div>
        <span class="text-xs text-gray-400">${e(generatedAt)}</span>
      </div>
      ${quotaNotice}
      ${profileBox}
      ${closeNotice}
      <div class="space-y-3">${cards}</div>
      ${methodology}
      <div class="border-t border-gray-200 pt-4 mt-6 flex items-center justify-between text-xs text-gray-400">
        <span>voteassist.me — הכלי חינמי וזמין לכל אחד</span>
        <span>${e(generatedAt)}</span>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&family=Noto+Sans:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4; margin: 18mm 20mm; }
    body { font-family: 'Heebo', 'Noto Sans', Arial, sans-serif; }
  </style>
</head>
<body class="bg-white text-gray-900 py-6 px-4">
  ${body}
</body>
</html>`;
}
