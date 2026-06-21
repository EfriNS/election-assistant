/**
 * Generates docs/advisor-review/questions-review.md from lib/questions.ts + lib/parties.ts
 * Run: npx tsx scripts/export-questions-review.ts
 *
 * Produces a human-readable review document for the domain expert advisor to annotate.
 * After review, apply score corrections manually to lib/questions.ts and update the
 * review date comment at the top of that file.
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
};

const SHORT_NAMES = PARTIES.map(p => {
  // Shorten for column headers
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
  out += `| אפשרות | ${SHORT_NAMES.join(" | ")} | הערות יועץ |\n`;
  out += `|---|${sep}|---|\n`;
  for (const opt of q.options) {
    const scores = opt.scores.map(fmt).join(" | ");
    out += `| ${opt.text} | ${scores} | |\n`;
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
  doc += `**גרסת הנתונים:** ראו הערה בקובץ \`lib/questions.ts\`\n\n`;
  doc += `**טווח ציונים:** −2 (המפלגה מתנגדת בחוזקה) עד +2 (המפלגה תומכת בחוזקה). 0 = ניטרלי / אין עמדה.\n\n`;
  doc += `**סדר מפלגות (שמאל ← ימין):** ${SHORT_NAMES.join(" | ")}\n\n`;
  doc += `---\n\n`;
  doc += `## הנחיות לסקירה\n\n`;
  doc += `1. בעמודת **"הערות יועץ"** — ציינו לכל אפשרות: האם הציון נכון? אם לא, מה הציון המוצע?\n`;
  doc += `2. אם השאלה עצמה אינה ניטרלית — ציינו זאת בתחילת הטבלה.\n`;
  doc += `3. אם אפשרות כלשהי אינה קיימת בתוכנית של מפלגה — ציינו "אין עמדה ידועה".\n`;
  doc += `4. כל מפלגה חייבת לקבל ציון שונה (הבחנה בין מפלגות היא מטרת המערכת).\n\n`;
  doc += `---\n\n`;

  for (const topic of Object.keys(TOPIC_LABELS)) {
    const label = TOPIC_LABELS[topic];
    const formal   = QUESTIONS_FORMAL[topic];
    const personal = QUESTIONS_PERSONAL[topic];

    doc += `## ${label}\n\n`;

    doc += `### רישום ענייני\n\n`;
    doc += renderTopicTable(formal);
    doc += "\n\n";

    doc += `### רישום אישי\n\n`;
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
