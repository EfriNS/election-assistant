#!/usr/bin/env tsx
/**
 * Offline comparison of /api/score-topics behaviour across grounding versions.
 *
 * Feeds a fixed set of made-up user profiles (fixed opener choices and fixed
 * follow-up Q&A) through the real scoring prompt + model call, then through
 * calcResults(), and writes the AI scores and the party ranking per profile.
 * Run it once per code/data version (e.g. in a `main` worktree and on a
 * feature branch) and compare the outputs with --compare.
 *
 * The follow-up questions here are hand-written, not AI-generated, so the
 * scoring step is the only thing that differs between versions.
 *
 * Run:
 *   npx tsx scripts/compare-scoring.ts --label branch --runs 2 --out /tmp/branch.json
 *   npx tsx scripts/compare-scoring.ts --compare /tmp/main.json /tmp/branch.json
 *
 * Needs GEMINI_API_KEY (read from the environment, else from --env <file>,
 * default .env.local). Makes (profiles × runs) paid model calls.
 */

import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync } from "fs";
import { buildScoringPrompt, buildScoreResponseSchema } from "@/lib/score-topics-prompt";
import { calcResults, type TopicQA } from "@/lib/scoring";
import { QUESTIONS_FORMAL } from "@/lib/questions";
import { TOPICS } from "@/lib/topics";
import { PARTIES } from "@/lib/parties";

const MODEL = "gemini-3.1-flash-lite"; // same as app/api/score-topics/route.ts
const TOPIC_WEIGHT = 3; // every topic "important", none critical — keeps the gate out of the comparison

type FollowUp = { question: string; options: [string, string, string] };

// Two fixed follow-ups per topic, each with three answers running roughly
// left → centre → right, so a profile is just a pick (0/1/2) per question.
const FOLLOW_UPS: Record<string, [FollowUp, FollowUp]> = {
  security: [
    {
      question: "מה צריך לקרות ברצועת עזה ביום שאחרי?",
      options: [
        "נסיגה ישראלית, שלטון פלסטיני מתון בסיוע בינלאומי, ותהליך מדיני",
        "שליטה ביטחונית ישראלית עד פירוז מלא, בלי לנהל את חיי התושבים",
        "שליטה ישראלית מלאה, עידוד הגירה מרצון וחידוש ההתיישבות",
      ],
    },
    {
      question: "איך נכון לפעול מול חיזבאללה ואיראן?",
      options: [
        "הסדרים מדיניים וכוח בינלאומי, בתיאום עם ארצות הברית",
        "אכיפה תקיפה של כל הפרה ושמירה על חופש פעולה צבאי",
        "מערכה צבאית יזומה עד הכרעה, גם בלי תיאום עם מדינות אחרות",
      ],
    },
  ],
  economy: [
    {
      question: "מה הצעד החשוב ביותר להורדת יוקר המחיה?",
      options: [
        "פיקוח על מחירים והגדלת קצבאות ושכר המינימום",
        "פירוק מונופולים ופתיחת השוק ליבוא ולתחרות",
        "הפחתת מסים ורגולציה וצמצום המגזר הציבורי",
      ],
    },
    {
      question: "האם הטבות מהמדינה צריכות להיות תלויות בשירות צבאי או אזרחי?",
      options: [
        "לא — זכויות חברתיות מגיעות לכל אזרח לפי צורך",
        "כן, במידה — עדיפות למשרתים בלי לשלול זכויות בסיס",
        "כן — מי שלא משרת לא יקבל הטבות מהמדינה",
      ],
    },
  ],
  housing: [
    {
      question: "מה יוריד את מחירי הדיור?",
      options: [
        "בנייה ציבורית ודיור להשכרה במחיר מפוקח",
        "קיצור הליכי התכנון והעברת סמכויות לרשויות המקומיות",
        "הרחבת הבנייה בכל חלקי הארץ, כולל ביהודה ושומרון",
      ],
    },
    {
      question: "למי צריכה להינתן עדיפות בסיוע בדיור?",
      options: [
        "למעוטי הכנסה ולזכאי הדיור הציבורי",
        "לזוגות צעירים ולמשפחות עובדות",
        "למשרתי מילואים ולבוגרי שירות צבאי",
      ],
    },
  ],
  education: [
    {
      question: "האם לממן מוסדות חינוך שאינם מלמדים לימודי ליבה?",
      options: [
        "לא — מימון ציבורי רק למי שמלמד ליבה מלאה",
        "לעודד לימודי ליבה בהדרגה, בלי לשלול תקציב",
        "כן — לכל קהילה הזכות לחנך לפי דרכה במימון המדינה",
      ],
    },
    {
      question: "מה הכי חשוב לשנות בבתי הספר?",
      options: [
        "תקצוב שוויוני וצמצום פערים בין המרכז לפריפריה ובין המגזרים",
        "שכר גבוה למורים טובים ועצמאות למנהלים",
        "חיזוק הזהות היהודית והציונית בתוכנית הלימודים",
      ],
    },
  ],
  health: [
    {
      question: "איך לקצר את התורים במערכת הבריאות?",
      options: [
        "הגדלת התקציב הציבורי ותוספת מיטות ותקנים",
        "העברת שירותים מבתי החולים לקהילה ושימוש בטכנולוגיה",
        "הרחבת הרפואה הפרטית והביטוחים המשלימים",
      ],
    },
    {
      question: "במה להשקיע קודם?",
      options: [
        "בבתי חולים ובשירותי בריאות בצפון ובדרום",
        "בבריאות הנפש ובשיקום נפגעי המלחמה",
        "בהרחבת סל התרופות",
      ],
    },
  ],
  religion: [
    {
      question: "מה עמדתך בעניין גיוס בני הישיבות?",
      options: [
        "גיוס חובה לכולם, ושלילת תקציבים ממי שלא משרת",
        "גיוס הדרגתי בהסכמה, עם מסלולים מותאמים",
        "לימוד התורה הוא שירות למדינה, ואין לכפות גיוס",
      ],
    },
    {
      question: "האם לאפשר נישואים אזרחיים ותחבורה ציבורית בשבת?",
      options: [
        "כן, בכל הארץ",
        "כל רשות מקומית תחליט לפי אופי תושביה",
        "לא — יש לשמור על הסטטוס קוו",
      ],
    },
  ],
  justice: [
    {
      question: "מי צריך לבחור את שופטי בית המשפט העליון?",
      options: [
        "ועדה מקצועית שאינה נשלטת בידי פוליטיקאים",
        "ועדה מאוזנת בין נבחרי ציבור, שופטים ואנשי מקצוע",
        "נבחרי הציבור, באמצעות הממשלה והכנסת",
      ],
    },
    {
      question: "האם הכנסת צריכה להיות מסוגלת לבטל פסיקה של בית המשפט העליון?",
      options: [
        "לא — לבית המשפט המילה האחרונה",
        "רק ברוב גדול ובהסכמה רחבה",
        "כן, ברוב רגיל של חברי הכנסת",
      ],
    },
  ],
  equality: [
    {
      question: "מה עמדתך בעניין זכויות הקהילה הגאה?",
      options: [
        "שוויון מלא בחוק, כולל נישואים והורות",
        "הגנה מפני אפליה, בלי לשנות את מוסד הנישואים",
        "מדינה יהודית צריכה לשמור על המשפחה המסורתית",
      ],
    },
    {
      question: "איך צריכה המדינה להתייחס לאזרחיה הערבים?",
      options: [
        "שוויון אזרחי מלא, תיקון חוק הלאום והשקעה בסגירת פערים",
        "שילוב בתעסוקה ובשירות לצד אכיפת החוק",
        "זכויות מלאות רק למי שמגלה נאמנות למדינה היהודית",
      ],
    },
  ],
  ecology: [
    {
      question: "מה נכון לעשות בעניין משבר האקלים?",
      options: [
        "חוק אקלים מחייב עם יעדים ותקציב, גם אם זה יעלה כסף",
        "מעבר הדרגתי לאנרגיה מתחדשת בלי לייקר את החשמל",
        "זה לא בראש סדר העדיפויות — קודם ביטחון וכלכלה",
      ],
    },
    {
      question: "איך לטפל בתעשיות מזהמות, כמו במפרץ חיפה?",
      options: [
        "לפנות אותן לפי לוח זמנים מחייב",
        "להחמיר אכיפה ותקנים, בלי לסגור מפעלים",
        "להקל ברגולציה כדי לא לפגוע בתעסוקה",
      ],
    },
  ],
};

type Profile = {
  id: string;
  label: string;
  // topicId → [opener option id, pick for follow-up 1, pick for follow-up 2]
  answers: Record<string, [string, 0 | 1 | 2, 0 | 1 | 2]>;
};

const PROFILES: Profile[] = [
  {
    id: "left-secular", label: "שמאל חילוני",
    answers: {
      security: ["peace", 0, 0], economy: ["minwage", 0, 0], housing: ["public", 0, 0],
      education: ["equal", 0, 0], health: ["basket", 0, 0], religion: ["freedom", 0, 0],
      justice: ["independence", 0, 0], equality: ["law", 0, 0], ecology: ["green", 0, 0],
    },
  },
  {
    id: "centre-liberal", label: "מרכז ליברלי",
    answers: {
      security: ["west", 1, 0], economy: ["growth", 1, 1], housing: ["market", 1, 1],
      education: ["skills", 0, 1], health: ["geography", 1, 0], religion: ["freedom", 0, 1],
      justice: ["consensus", 1, 1], equality: ["lgbtq", 0, 1], ecology: ["gradual", 0, 0],
    },
  },
  {
    id: "right-liberal-hawk", label: "ימין ביטחוני-ליברלי",
    answers: {
      security: ["control", 1, 1], economy: ["market", 2, 2], housing: ["service", 1, 2],
      education: ["skills", 0, 1], health: ["private", 2, 0], religion: ["freedom", 0, 1],
      justice: ["oversight", 1, 1], equality: ["character", 1, 1], ecology: ["gradual", 1, 1],
    },
  },
  {
    id: "right-religious", label: "ימין דתי-לאומי",
    answers: {
      security: ["control", 2, 2], economy: ["market", 2, 2], housing: ["settlement", 2, 2],
      education: ["values", 1, 2], health: ["geography", 0, 0], religion: ["jewish_state", 1, 2],
      justice: ["oversight", 2, 2], equality: ["character", 2, 2], ecology: ["deregulation", 2, 2],
    },
  },
  {
    id: "haredi-social", label: "חרדי-חברתי",
    answers: {
      security: ["control", 1, 1], economy: ["minwage", 0, 0], housing: ["public", 0, 1],
      education: ["values", 2, 2], health: ["basket", 0, 2], religion: ["jewish_state", 2, 2],
      justice: ["oversight", 2, 2], equality: ["character", 2, 1], ecology: ["gradual", 1, 1],
    },
  },
  {
    id: "left-arab-jewish", label: "שמאל ערבי-יהודי",
    answers: {
      security: ["peace", 0, 0], economy: ["redistrib", 0, 0], housing: ["public", 0, 0],
      education: ["equal", 1, 0], health: ["basket", 0, 0], religion: ["equality_all", 1, 1],
      justice: ["diversity", 0, 0], equality: ["represent", 0, 0], ecology: ["green", 0, 0],
    },
  },
  {
    id: "centre-right-traditional", label: "מרכז-ימין מסורתי",
    answers: {
      security: ["west", 1, 1], economy: ["growth", 1, 1], housing: ["service", 1, 2],
      education: ["quality", 1, 1], health: ["geography", 0, 1], religion: ["jewish_state", 1, 1],
      justice: ["consensus", 1, 1], equality: ["character", 1, 1], ecology: ["gradual", 1, 1],
    },
  },
  {
    id: "centre-left-security", label: "שמאל-מרכז ביטחוניסטי",
    answers: {
      security: ["west", 1, 0], economy: ["minwage", 1, 1], housing: ["public", 0, 1],
      education: ["equal", 0, 0], health: ["basket", 0, 1], religion: ["freedom", 0, 0],
      justice: ["independence", 0, 1], equality: ["law", 0, 0], ecology: ["green", 0, 0],
    },
  },
];

type RunRecord = {
  profile: string;
  run: number;
  promptChars: number;
  promptTokens: number;
  aiScores: Record<string, Record<string, number | null>>;
  ranking: { id: string; score: number }[];
};

type OutputFile = {
  label: string;
  model: string;
  openerOnly: Record<string, { id: string; score: number }[]>;
  records: RunRecord[];
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function loadApiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const envFile = arg("--env") ?? ".env.local";
  const line = readFileSync(envFile, "utf8").split("\n").find((l) => l.startsWith("GEMINI_API_KEY="));
  if (!line) throw new Error(`GEMINI_API_KEY not found in ${envFile}`);
  return line.slice("GEMINI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
}

function buildInputs(profile: Profile) {
  const topicQA: Record<string, TopicQA> = {};
  const buckets: Record<string, number> = {};
  const scoringTopics = TOPICS.map((topic) => {
    const [openerId, pick1, pick2] = profile.answers[topic.id];
    const opener = QUESTIONS_FORMAL[topic.id].options.find((o) => o.id === openerId);
    if (!opener) throw new Error(`${profile.id}: no opener option "${openerId}" in ${topic.id}`);
    const followUps = FOLLOW_UPS[topic.id].map((fu, i) => ({
      question: fu.question,
      options: [...fu.options],
      answer: fu.options[i === 0 ? pick1 : pick2],
    }));
    topicQA[topic.id] = { openerAnswerId: openerId, openerAnswerText: opener.text, followUps };
    buckets[topic.id] = TOPIC_WEIGHT;
    return {
      topicId: topic.id,
      topicLabel: topic.label,
      openerQuestion: QUESTIONS_FORMAL[topic.id].question,
      openerAnswer: opener.text,
      followUpQA: followUps.map(({ question, answer }) => ({ question, answer })),
    };
  });
  return { topicQA, buckets, scoringTopics };
}

function toRanking(result: ReturnType<typeof calcResults>) {
  return result.ranked.map((p) => ({ id: p.id, score: p.score }));
}

async function collect() {
  const label = arg("--label") ?? "run";
  const runs = Number(arg("--runs") ?? "2");
  const out = arg("--out");
  if (!out) throw new Error("--out <file> is required");
  const ai = new GoogleGenAI({ apiKey: loadApiKey() });

  const output: OutputFile = { label, model: MODEL, openerOnly: {}, records: [] };
  for (const profile of PROFILES) {
    const { topicQA, buckets, scoringTopics } = buildInputs(profile);
    // Opener-only ranking: what calcResults gives when the AI step returns nothing.
    const noFollowUps = Object.fromEntries(
      Object.entries(topicQA).map(([tid, qa]) => [tid, { ...qa, followUps: [] }])
    );
    output.openerOnly[profile.id] = toRanking(calcResults(buckets, noFollowUps, QUESTIONS_FORMAL));

    const prompt = buildScoringPrompt(scoringTopics);
    for (let run = 1; run <= runs; run++) {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 1500,
          responseMimeType: "application/json",
          responseJsonSchema: buildScoreResponseSchema(scoringTopics),
        },
      });
      const flat: Record<string, number | null> = JSON.parse(response.text ?? "{}");
      const aiScores: Record<string, Record<string, number | null>> = {};
      for (const t of scoringTopics) {
        aiScores[t.topicId] = {};
        for (const p of PARTIES) aiScores[t.topicId][p.id] = flat[`${t.topicId}.${p.id}`] ?? null;
      }
      output.records.push({
        profile: profile.id,
        run,
        promptChars: prompt.length,
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        aiScores,
        ranking: toRanking(calcResults(buckets, topicQA, QUESTIONS_FORMAL, aiScores)),
      });
      console.log(`${label} ${profile.id} run ${run}: ${response.usageMetadata?.promptTokenCount ?? "?"} prompt tokens`);
    }
  }
  writeFileSync(out, JSON.stringify(output, null, 1));
  console.log(`wrote ${out}`);
}

// ─── Comparison ────────────────────────────────────────────────────────────

function meanAbsScoreDiff(a: RunRecord, b: RunRecord) {
  let sum = 0, n = 0, flips = 0, nullMismatch = 0;
  for (const tid of Object.keys(a.aiScores)) {
    for (const pid of Object.keys(a.aiScores[tid])) {
      const x = a.aiScores[tid][pid], y = b.aiScores[tid]?.[pid];
      if (x === null || y === null || y === undefined) { if (x !== y) nullMismatch++; continue; }
      sum += Math.abs(x - y); n++;
      if (x * y < 0) flips++;
    }
  }
  return { mean: n ? sum / n : 0, compared: n, flips, nullMismatch };
}

function rankShift(a: { id: string }[], b: { id: string }[]) {
  const pos = new Map(b.map((p, i) => [p.id, i]));
  const shifts = a.map((p, i) => Math.abs(i - (pos.get(p.id) ?? i)));
  return { mean: shifts.reduce((s, x) => s + x, 0) / shifts.length, max: Math.max(...shifts) };
}

function top(r: { id: string; score: number }[], n = 5) {
  return r.slice(0, n).map((p) => `${p.id} ${p.score}`).join(", ");
}

function compare(fileA: string, fileB: string) {
  const A: OutputFile = JSON.parse(readFileSync(fileA, "utf8"));
  const B: OutputFile = JSON.parse(readFileSync(fileB, "utf8"));
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
  const tokens = (f: OutputFile) => Math.round(avg(f.records.map((r) => r.promptTokens)));
  console.log(`# ${A.label} vs ${B.label}\n`);
  console.log(`Average prompt tokens: ${A.label} ${tokens(A)}, ${B.label} ${tokens(B)}\n`);

  const noiseA: number[] = [], noiseB: number[] = [], between: number[] = [];
  const shiftNoiseA: number[] = [], shiftNoiseB: number[] = [], shiftBetween: number[] = [];
  let flipsBetween = 0, flipsNoise = 0, top1Changed = 0, top3Changed = 0;

  for (const profile of PROFILES) {
    const a = A.records.filter((r) => r.profile === profile.id);
    const b = B.records.filter((r) => r.profile === profile.id);
    if (a.length === 0 || b.length === 0) continue;
    console.log(`## ${profile.label} (${profile.id})`);
    console.log(`- opener only, ${A.label}: ${top(A.openerOnly[profile.id])}`);
    console.log(`- opener only, ${B.label}: ${top(B.openerOnly[profile.id])}`);
    a.forEach((r) => console.log(`- ${A.label} run ${r.run}: ${top(r.ranking)}`));
    b.forEach((r) => console.log(`- ${B.label} run ${r.run}: ${top(r.ranking)}`));
    if (a.length > 1) { const d = meanAbsScoreDiff(a[0], a[1]); noiseA.push(d.mean); flipsNoise += d.flips; shiftNoiseA.push(rankShift(a[0].ranking, a[1].ranking).mean); }
    if (b.length > 1) { const d = meanAbsScoreDiff(b[0], b[1]); noiseB.push(d.mean); flipsNoise += d.flips; shiftNoiseB.push(rankShift(b[0].ranking, b[1].ranking).mean); }
    const d = meanAbsScoreDiff(a[0], b[0]);
    between.push(d.mean); flipsBetween += d.flips;
    shiftBetween.push(rankShift(a[0].ranking, b[0].ranking).mean);
    if (a[0].ranking[0].id !== b[0].ranking[0].id) top1Changed++;
    const set = (r: RunRecord) => r.ranking.slice(0, 3).map((p) => p.id).sort().join(",");
    if (set(a[0]) !== set(b[0])) top3Changed++;
    console.log(`- AI score change ${A.label}→${B.label}: mean |Δ| ${d.mean.toFixed(2)} over ${d.compared} party-topic scores, ${d.flips} sign flips, ${d.nullMismatch} null/non-null changes\n`);
  }

  console.log(`## Summary`);
  console.log(`- AI score mean |Δ| between two runs of the same version (noise): ${A.label} ${avg(noiseA).toFixed(2)}, ${B.label} ${avg(noiseB).toFixed(2)}`);
  console.log(`- AI score mean |Δ| between versions: ${avg(between).toFixed(2)}`);
  console.log(`- Sign flips: ${flipsNoise} within versions (both), ${flipsBetween} between versions`);
  console.log(`- Mean rank shift per party: within ${A.label} ${avg(shiftNoiseA).toFixed(2)}, within ${B.label} ${avg(shiftNoiseB).toFixed(2)}, between versions ${avg(shiftBetween).toFixed(2)}`);
  console.log(`- Profiles whose top party changed between versions: ${top1Changed} of ${PROFILES.length}`);
  console.log(`- Profiles whose top-3 set changed between versions: ${top3Changed} of ${PROFILES.length}`);
}

const compareIdx = process.argv.indexOf("--compare");
if (compareIdx >= 0) {
  compare(process.argv[compareIdx + 1], process.argv[compareIdx + 2]);
} else {
  collect().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
}
