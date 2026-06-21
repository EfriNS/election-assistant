/**
 * Generates docs/advisor-review/questions-review.md from lib/questions.ts + lib/parties.ts
 * Run: npm run export:questions
 *
 * Produces a human-readable review document for the domain expert advisor to annotate.
 * After review, the developer applies score/phrasing corrections manually to lib/questions.ts.
 */

import { QUESTIONS_FORMAL, QUESTIONS_PERSONAL, type TopicQ } from "../lib/questions";
import { PARTIES } from "../lib/parties";
import { writeFileSync, mkdirSync } from "fs";

const TOPIC_LABELS: Record<string, string> = {
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
  if (n.includes('חד"ש')) return 'חד"ש';
  if (n.includes("דמוקרטים")) return "דמוקרטים";
  return n;
});

function fmt(score: number): string {
  if (score > 0) return `+${score}`;
  return `${score}`;
}

function renderTopicTable(q: TopicQ): string {
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

function main() {
  const today = new Date().toLocaleDateString("he-IL", {
    day: "numeric", month: "long", year: "numeric",
  });

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
  doc += `| +2   | המפלגה תומכת בחוזקה — ממש חלק מהתוכנית שלה |\n`;
  doc += `| +1   | המפלגה נוטה לתמוך, אך לא בראש סדר עדיפויותיה |\n`;
  doc += `|  0   | ניטרלי / עמדה מאוזנת |\n`;
  doc += `| -1   | המפלגה נוטה להתנגד |\n`;
  doc += `| -2   | המפלגה מתנגדת בחוזקה |\n\n`;
  doc += `**חשוב:** השתמש בכל 5 הרמות כשמתאים. 0 = עמדה מאוזנת *באמת* — אם המפלגה פשוט לא פרסמה עמדה, ציין זאת בהערות ואנחנו נטפל בזה בשלב איסוף המצעים.\n\n`;

  doc += `### 4. הבחנה בין מפלגות\n\n`;
  doc += `אין חובה שלכל מפלגה יהיה ציון שונה על כל אפשרות — מפלגות עם עמדות דומות יקבלו ציון זהה, וזה לגמרי תקין.\n`;
  doc += `**כן לסמן:** אפשרות שבה **כל 7 המפלגות** מקבלות ציון זהה — אפשרות כזו אינה מבדילה בין המפלגות כלל.\n\n`;

  doc += `### 5. כיצד השינויים מגיעים לאתר\n\n`;
  doc += `לאחר הסקירה, המפתח יקרא את ההערות ויעדכן ידנית את קובץ הקוד (\`lib/questions.ts\`). עמודת "מזהה" מאפשרת למפתח לאתר בדיוק כל אפשרות בקוד.\n`;
  doc += `**אין צורך לדאוג לפורמט** — כתוב חופשי בעמודת "הערות יועץ".\n\n`;

  doc += `---\n\n`;

  for (const topic of Object.keys(TOPIC_LABELS)) {
    const label = TOPIC_LABELS[topic];
    const formal   = QUESTIONS_FORMAL[topic];
    const personal = QUESTIONS_PERSONAL[topic];

    doc += `## ${label}\n\n`;

    doc += `### ניסוח ענייני\n\n`;
    doc += renderTopicTable(formal);
    doc += "\n\n";

    doc += `### ניסוח אישי (זורם)\n\n`;
    doc += renderTopicTable(personal);
    doc += "\n\n---\n\n";
  }

  doc += `## הערות כלליות\n\n`;
  doc += `_כתבו כאן כל הערה שאינה ספציפית לשאלה אחת — למשל: נושאים חסרים, שאלות שנראות דומות מדי, חשש לניסוח מוטה._\n\n`;

  mkdirSync("docs/advisor-review", { recursive: true });
  writeFileSync("docs/advisor-review/questions-review.md", doc, "utf-8");
  console.log("✅ Generated: docs/advisor-review/questions-review.md");
}

main();
