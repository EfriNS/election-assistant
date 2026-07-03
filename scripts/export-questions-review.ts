/**
 * Generates docs/advisor-review/questions-review.md and questions-review.html
 * from lib/questions.ts + lib/parties.ts
 * Run: npm run export:questions
 *
 * Produces a human-readable review document for the domain expert advisor.
 * After review, the developer applies score/phrasing corrections manually to lib/questions.ts.
 */

import { QUESTIONS_FORMAL, QUESTIONS_PERSONAL, TOPIC_KEY_DIMENSIONS, type TopicQ } from "../lib/questions";
import { PARTIES } from "../lib/parties";
import { GROUNDINGS } from "../lib/groundings";
import { TOPICS } from "../lib/topics";
import { writeFileSync, mkdirSync } from "fs";

// How many parties currently have grounding coverage for a given follow-up
// dimension — computed live so it can never drift from data/groundings/*.json,
// unlike the "N parties" figures in TOPIC_KEY_DIMENSIONS' inline comments.
function countPartiesForAspect(topicId: string, aspectId: string): number {
  return Object.values(GROUNDINGS).filter((pg) =>
    (pg.topics[topicId] ?? []).some((e) => !e.absent && e.aspect === aspectId)
  ).length;
}

// Short display labels for this document only (lib/topics.ts's TOPIC_LABELS are
// the longer canonical ones used in the app itself). Order is NOT taken from this
// dict — it's derived from TOPICS (lib/topics.ts) so this doc always matches
// PrioritiesStep's display order, including any future reordering.
const SHORT_TOPIC_LABELS: Record<string, string> = {
  security:  "ביטחון",
  economy:   "כלכלה",
  housing:   "דיור",
  education: "חינוך",
  health:    "בריאות",
  religion:  "דת ומדינה",
  justice:   "מערכת המשפט / שלטון החוק",
  equality:  "זכויות ושוויון",
  ecology:   "סביבה ואנרגיה",
};

const SHORT_NAMES = PARTIES.map(p => {
  const n = p.name;
  if (n.includes("ביתנו")) return "ביתנו";
  if (n.includes('חד"ש')) return 'חד"ש-תע"ל';
  if (n.includes("דמוקרטים")) return "דמוקרטים";
  return n;
});

function fmt(score: number): string {
  return score > 0 ? `+${score}` : `${score}`;
}

// ─── Markdown rendering ────────────────────────────────────────────────────────

function renderTopicTableMD(q: TopicQ): string {
  const sep = SHORT_NAMES.map(() => "---").join(" | ");
  let out = `**שאלה:** ${q.question}\n\n`;
  out += `| מזהה | אפשרות | ${SHORT_NAMES.join(" | ")} | הערות יועץ |\n`;
  out += `|---|---|${sep}|---|\n`;
  for (const opt of q.options) {
    const scores = opt.scores.map(fmt).join(" | ");
    out += `| \`${opt.id}\` | ${opt.text} | ${scores} | |\n`;
  }
  return out;
}

function renderSubdimensionsMD(topicId: string, topicLabel: string): string {
  const dims = TOPIC_KEY_DIMENSIONS[topicId] ?? [];
  const rows = dims.length > 0
    ? dims
        .map((id) => `| \`${id}\` (${countPartiesForAspect(topicId, id)} מפלגות) | | |`)
        .join("\n")
    : "| | | |\n| | | |\n| | | |\n| | | |";

  return `### תת-ממדים לשאלות המשך

המערכת תציג למשתמשים שאלות המשך (follow-up) שנועדו לחשוף ניואנסים שהשאלה הפתיחה לא הספיקה לתפוס.
כדי שהשאלות האלה יהיו שימושיות — הן צריכות לגעת בממדים שבהם המפלגות **באמת** נבדלות.

הרשימה שלמטה היא תת-הממדים שכבר מוגדרים במערכת עבור **${topicLabel}** (\`TOPIC_KEY_DIMENSIONS\` ב-\`lib/questions.ts\`), עם מספר המפלגות שיש להן כרגע ביסוס בפועל לכל תת-ממד.
**שאלה לסוקר:** האם הרשימה הזו נכונה? יש תת-ממד שחסר, לא רלוונטי, או מנוסח לא מדויק? מה המחלוקת בפועל בכל תת-ממד, ואילו מפלגות נבדלות עליו?

| שם תת-ממד | מה המחלוקת בפועל? | מה מבדיל את המפלגות? |
|-----------|-------------------|----------------------|
${rows}

`;
}

function generateMarkdown(today: string): string {
  let doc = "";
  doc += `# Election Assistant — חוברת סקירה ליועץ\n\n`;
  doc += `**תאריך הפקה:** ${today}  \n`;
  doc += `**סדר מפלגות (שמאל ← ימין):** ${SHORT_NAMES.join(" | ")}\n\n`;
  doc += `---\n\n`;

  doc += `## הנחיות לסקירה\n\n`;

  doc += `### 1. שני סוגי משוב\n\n`;
  doc += `**ניסוח** — האם השאלה ואפשרויות התשובה מנוסחות היטב?\n`;
  doc += `- האם השאלה ניטרלית (לא מוטה לכיוון מסוים)?\n`;
  doc += `- האם כל האפשרויות מייצגות עמדות פוליטיות קיימות?\n`;
  doc += `- האם השפה ברורה ונגישה לציבור הרחב?\n\n`;
  doc += `**ציונים** — האם ציוני המפלגות נכונים?\n`;
  doc += `- בדוק כל שורה: האם הציון של כל מפלגה על כל אפשרות משקף נאמנה את עמדתה?\n`;
  doc += `- אם לא — ציין את הציון המוצע בעמודת "הערות יועץ"\n\n`;

  doc += `### 2. ציונים וביסוס — מה ההבדל?\n\n`;
  doc += `**ציונים** (הטבלאות כאן) = המספרים שהאלגוריתם משתמש בהם לחישוב תוצאת המשתמש.\n`;
  doc += `**ביסוס** = ציטוטים ממצעי המפלגות שיוצגו למשתמש בדף התוצאות ("למה המפלגה קיבלה ציון זה"). זהו שלב נפרד ועתידי — הציונים שכאן ישארו גם לאחר הוספת הציטוטים.\n\n`;
  doc += `לסקירה הנוכחית: הציונים הם הערכות ראשוניות. אנחנו מבקשים את ידע המומחה שלך לכיולם. חלקם עשויים להשתנות עוד כשנאסוף מצעים רשמיים (שלב 0.2).\n\n`;

  doc += `### 3. סקאלת הציונים\n\n`;
  doc += `| ציון | משמעות |\n`;
  doc += `|------|--------|\n`;
  doc += `| +2   | המפלגה תומכת מאוד — ממש חלק מהתוכנית שלה |\n`;
  doc += `| +1   | המפלגה נוטה לתמוך, אך זה לא בראש סדר עדיפויותיה |\n`;
  doc += `|  0   | ניטרלי / עמדה מאוזנת |\n`;
  doc += `| -1   | המפלגה נוטה להתנגד |\n`;
  doc += `| -2   | המפלגה מתנגדת מאוד |\n\n`;
  doc += `**חשוב:** השתמש בכל 5 הרמות כשמתאים. 0 = עמדה מאוזנת *באמת* — אם המפלגה פשוט לא פרסמה עמדה, ציין זאת בהערות ואנחנו נטפל בזה בשלב איסוף המצעים.\n\n`;

  doc += `### 4. הבחנה בין מפלגות\n\n`;
  doc += `אין חובה שלכל מפלגה יהיה ציון שונה על כל אפשרות — מפלגות עם עמדות דומות יקבלו ציון זהה, וזה לגמרי תקין.\n`;
  doc += `**כן לסמן:** אפשרות שבה **כל 7 המפלגות** מקבלות ציון זהה — אפשרות כזו אינה מבדילה בין המפלגות כלל.\n\n`;

  doc += `### 5. תת-ממדים לשאלות המשך (חדש)\n\n`;
  doc += `בסוף כל נושא יופיע קטע חדש — **"תת-ממדים לשאלות המשך"**. זהו מידע שנצטרך כדי לבנות שאלות המשך שמבדילות בין מפלגות, ולא רק שאלות כלליות שמעמיקות בנושא.\n`;
  doc += `הסבר מלא מופיע בכל קטע. השאלה פשוטה: מה הם הממדים הספציפיים בנושא הזה שבהם המפלגות נוקטות עמדות שונות?\n\n`;

  doc += `### 6. כיצד השינויים מגיעים לאתר\n\n`;
  doc += `לאחר הסקירה, המפתח יקרא את ההערות ויעדכן ידנית את קובץ הקוד (\`lib/questions.ts\`). עמודת "מזהה" מאפשרת למפתח לאתר בדיוק כל אפשרות בקוד.\n`;
  doc += `**אין צורך לדאוג לפורמט** — כתוב חופשי בעמודת "הערות יועץ" ובקטעי תת-הממדים.\n\n`;

  doc += `---\n\n`;

  for (const { id: topic } of TOPICS) {
    const label = SHORT_TOPIC_LABELS[topic] ?? topic;
    const formal   = QUESTIONS_FORMAL[topic];
    const personal = QUESTIONS_PERSONAL[topic];

    doc += `## ${label}\n\n`;
    doc += `### ניסוח ענייני\n\n`;
    doc += renderTopicTableMD(formal);
    doc += "\n\n";
    doc += `### ניסוח אישי (זורם)\n\n`;
    doc += renderTopicTableMD(personal);
    doc += "\n\n";
    doc += renderSubdimensionsMD(topic, label);
    doc += "---\n\n";
  }

  doc += `## הערות כלליות\n\n`;
  doc += `_כתבו כאן כל הערה שאינה ספציפית לשאלה אחת — למשל: נושאים חסרים, שאלות שנראות דומות מדי, חשש לניסוח מוטה._\n\n`;

  return doc;
}

// ─── HTML rendering ────────────────────────────────────────────────────────────

function scoreClass(score: number): string {
  if (score >= 2) return "score s2";
  if (score === 1) return "score s1";
  if (score === 0) return "score s0";
  if (score === -1) return "score sm1";
  return "score sm2";
}

function renderTopicTableHTML(q: TopicQ): string {
  const headers = SHORT_NAMES.map(n => `<th class="party">${n}</th>`).join("");
  let rows = "";
  for (const opt of q.options) {
    const scoreCells = opt.scores
      .map(s => `<td class="${scoreClass(s)}">${fmt(s)}</td>`)
      .join("");
    rows += `<tr>
      <td class="id"><code>${opt.id}</code></td>
      <td class="option-text">${opt.text}</td>
      ${scoreCells}
      <td class="notes"></td>
    </tr>`;
  }
  return `<p class="question-label"><strong>שאלה:</strong> ${q.question}</p>
<table>
  <thead>
    <tr>
      <th>מזהה</th><th>אפשרות</th>${headers}<th class="notes-head">הערות יועץ</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function renderSubdimensionsHTML(topicId: string, topicLabel: string): string {
  const dims = TOPIC_KEY_DIMENSIONS[topicId] ?? [];
  const rows = dims.length > 0
    ? dims
        .map((id) => `<tr><td><code>${id}</code><br><span class="dimcount">(${countPartiesForAspect(topicId, id)} מפלגות)</span></td><td></td><td></td></tr>`)
        .join("")
    : Array(4).fill(0).map(() => `<tr><td></td><td></td><td></td></tr>`).join("");
  return `<div class="subdim-box">
  <h4>תת-ממדים לשאלות המשך — ${topicLabel}</h4>
  <p>המערכת תציג למשתמשים שאלות המשך שנועדו לחשוף ניואנסים שהשאלה הפתיחה לא הספיקה לתפוס.
  כדי שהשאלות האלה יהיו שימושיות — הן צריכות לגעת בממדים שבהם המפלגות <strong>באמת</strong> נבדלות.</p>
  <p>הרשימה שלמטה היא תת-הממדים שכבר מוגדרים במערכת עבור <strong>${topicLabel}</strong> (<code>TOPIC_KEY_DIMENSIONS</code>), עם מספר המפלגות שיש להן כרגע ביסוס בפועל.
  <strong>שאלה לסוקר:</strong> האם הרשימה נכונה? חסר תת-ממד? לא רלוונטי? מה המחלוקת בפועל, ואילו מפלגות נבדלות עליו?</p>
  <table class="subdim-table">
    <thead>
      <tr><th>שם תת-ממד</th><th>מה המחלוקת בפועל?</th><th>מה מבדיל את המפלגות?</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

function generateHTML(today: string): string {
  const CSS = `
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      direction: rtl; text-align: right;
      max-width: 1200px; margin: 0 auto; padding: 24px;
      color: #222; line-height: 1.6;
    }
    h1 { font-size: 1.5em; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { font-size: 1.25em; margin-top: 40px; background: #f0f0f0;
         padding: 8px 12px; border-right: 4px solid #555; }
    h3 { font-size: 1em; color: #555; margin-top: 24px; margin-bottom: 8px; }
    h4 { margin: 0 0 10px; font-size: 1em; }
    p { margin: 6px 0 12px; }

    table { border-collapse: collapse; width: 100%; margin: 12px 0 20px; font-size: 0.88em; }
    th, td { border: 1px solid #bbb; padding: 7px 9px; vertical-align: top; }
    th { background: #eee; font-weight: bold; text-align: center; }
    th.notes-head { text-align: right; min-width: 160px; }
    td.option-text { max-width: 340px; }
    td.id { font-family: monospace; font-size: 0.85em; text-align: center; white-space: nowrap; }
    td.notes { min-width: 160px; }

    td.score { text-align: center; font-family: monospace; font-weight: bold; white-space: nowrap; }
    td.s2  { background: #d4edda; color: #155724; }
    td.s1  { background: #eaf5ec; color: #2d6a4f; }
    td.s0  { background: #f8f9fa; color: #888;    }
    td.sm1 { background: #fdf0f0; color: #a94442; }
    td.sm2 { background: #f5c6cb; color: #721c24; }

    th.party { white-space: nowrap; min-width: 52px; }

    .subdim-box {
      background: #fffde7; border: 1px solid #f9c74f;
      border-radius: 6px; padding: 16px 20px; margin: 20px 0;
    }
    .subdim-box table { font-size: 0.88em; }
    .subdim-box td { min-height: 44px; height: 44px; }
    .subdim-box th { background: #fef9c3; }
    .subdim-box .dimcount { color: #888; font-size: 0.85em; }

    .question-label { font-size: 0.95em; margin-bottom: 6px; }
    .instructions { background: #f7f7f7; border: 1px solid #ddd;
                    border-radius: 4px; padding: 16px 20px; margin-bottom: 24px; }
    .scale-table { width: auto; }
    .scale-table td, .scale-table th { padding: 4px 12px; }
    .general-notes { background: #f0f4ff; border: 1px solid #b0c4de;
                     border-radius: 4px; padding: 16px; min-height: 120px; margin-top: 8px; }
    .meta { font-size: 0.9em; color: #555; margin-bottom: 20px; }
    hr { border: none; border-top: 1px solid #ccc; margin: 32px 0; }
    @media print {
      body { max-width: 100%; padding: 0; }
      h2 { page-break-before: auto; }
      .subdim-box { page-break-inside: avoid; }
      table { page-break-inside: avoid; }
    }
  `;

  const partyHeader = SHORT_NAMES.map(n => `<th class="party">${n}</th>`).join("");

  let body = `
  <h1>Election Assistant — חוברת סקירה ליועץ</h1>
  <p class="meta"><strong>תאריך הפקה:</strong> ${today} &nbsp;|&nbsp; <strong>סדר מפלגות (שמאל ← ימין):</strong> ${SHORT_NAMES.join(" | ")}</p>
  <hr>

  <div class="instructions">
    <h3 style="margin-top:0">הנחיות לסקירה</h3>

    <p><strong>ניסוח</strong> — האם השאלה ואפשרויות התשובה מנוסחות היטב?<br>
    האם השאלה ניטרלית? האם כל האפשרויות מייצגות עמדות פוליטיות קיימות? האם השפה ברורה לציבור הרחב?</p>

    <p><strong>ציונים</strong> — האם ציוני המפלגות נכונים?<br>
    בדוק כל שורה: האם הציון של כל מפלגה על כל אפשרות משקף נאמנה את עמדתה?
    אם לא — ציין את הציון המוצע בעמודת "הערות יועץ".</p>

    <p><strong>ציונים וביסוס — מה ההבדל?</strong><br>
    <strong>ציונים</strong> (הטבלאות כאן) = המספרים שהאלגוריתם משתמש בהם לחישוב תוצאת המשתמש.<br>
    <strong>ביסוס</strong> = ציטוטים ממצעים שיוצגו למשתמש בדף התוצאות. זהו שלב נפרד ועתידי.<br>
    הציונים כאן הם הערכות ראשוניות — אנחנו מבקשים את ידע המומחה שלך לכיולם.</p>

    <p><strong>סקאלת הציונים:</strong></p>
    <table class="scale-table">
      <tr><td class="score s2">+2</td><td>המפלגה תומכת בחוזקה — ממש חלק מהתוכנית שלה</td></tr>
      <tr><td class="score s1">+1</td><td>המפלגה נוטה לתמוך, אך לא בראש סדר עדיפויותיה</td></tr>
      <tr><td class="score s0"> 0</td><td>ניטרלי / עמדה מאוזנת</td></tr>
      <tr><td class="score sm1">−1</td><td>המפלגה נוטה להתנגד</td></tr>
      <tr><td class="score sm2">−2</td><td>המפלגה מתנגדת בחוזקה</td></tr>
    </table>
    <p>השתמש בכל 5 הרמות. 0 = עמדה מאוזנת <em>באמת</em> — אם המפלגה פשוט לא פרסמה עמדה, ציין זאת בהערות.</p>

    <p><strong>תת-ממדים לשאלות המשך (חדש בסקירה זו):</strong><br>
    בסוף כל נושא יש קטע צהוב. שם אנחנו מבקשים את דעתך על הממדים הספציפיים שבהם המפלגות נבדלות —
    כדי שהמערכת תוכל לשאול שאלות המשך שמבדילות בין מפלגות, לא רק שאלות שמעמיקות בנושא.</p>

    <p><strong>כיצד השינויים מגיעים לאתר:</strong><br>
    לאחר הסקירה, המפתח יקרא את ההערות ויעדכן ידנית את קובץ הקוד. עמודת "מזהה" מאפשרת לאתר בדיוק כל אפשרות בקוד.
    אין צורך לדאוג לפורמט — כתוב חופשי.</p>
  </div>
  `;

  for (const { id: topic } of TOPICS) {
    const label = SHORT_TOPIC_LABELS[topic] ?? topic;
    const formal   = QUESTIONS_FORMAL[topic];
    const personal = QUESTIONS_PERSONAL[topic];

    body += `<h2>${label}</h2>`;
    body += `<h3>ניסוח ענייני</h3>`;
    body += renderTopicTableHTML(formal);
    body += `<h3>ניסוח אישי (זורם)</h3>`;
    body += renderTopicTableHTML(personal);
    body += renderSubdimensionsHTML(topic, label);
    body += `<hr>`;
  }

  body += `<h2>הערות כלליות</h2>
  <p><em>כתבו כאן כל הערה שאינה ספציפית לשאלה אחת — למשל: נושאים חסרים, שאלות שנראות דומות מדי, חשש לניסוח מוטה.</em></p>
  <div class="general-notes"></div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Election Assistant — חוברת סקירה ליועץ</title>
  <style>${CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const today = new Date().toLocaleDateString("he-IL", {
    day: "numeric", month: "long", year: "numeric",
  });

  mkdirSync("docs/advisor-review", { recursive: true });

  const md = generateMarkdown(today);
  writeFileSync("docs/advisor-review/questions-review.md", md, "utf-8");
  console.log("✅ Generated: docs/advisor-review/questions-review.md");

  const html = generateHTML(today);
  writeFileSync("docs/advisor-review/questions-review.html", html, "utf-8");
  console.log("✅ Generated: docs/advisor-review/questions-review.html");
}

main();
