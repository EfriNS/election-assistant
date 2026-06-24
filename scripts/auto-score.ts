#!/usr/bin/env tsx
/**
 * Derives party position scores from grounding data using Claude Sonnet.
 *
 * Run:
 *   npx tsx --env-file .env.local scripts/auto-score.ts
 *   (or set ANTHROPIC_API_KEY in the environment directly)
 *
 * Outputs:
 *   scripts/proposed-scores.json   — machine-readable proposed scores (gitignored)
 *   docs/score-review.md           — human-readable review document
 *
 * After reviewing docs/score-review.md, run:
 *   npx tsx --env-file .env.local scripts/apply-scores.ts
 * to apply approved scores to lib/questions.ts.
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";

// ─── Dynamic imports (handled below after path resolution) ────────────────────
// We read these with require() to avoid ESM/CJS issues in tsx

const TOPIC_LABELS: Record<string, string> = {
  security:  "ביטחון",
  economy:   "כלכלה",
  housing:   "דיור",
  education: "חינוך",
  health:    "בריאות",
  religion:  "דת ומדינה",
  justice:   "מערכת המשפט",
  equality:  "זכויות ושוויון",
  ecology:   "סביבה ואנרגיה",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroundingEntry {
  text: string;
  aspect: string;
  sourceUrl?: string;
  contrary?: string;
  absent?: boolean;
}

interface PartyGroundings {
  platformAvailable: boolean;
  sourceUrl?: string;
  topics: Record<string, GroundingEntry[]>;
}

interface Party {
  id: string;
  name: string;
}

interface Option {
  id: string;
  text: string;
  scores: number[];
}

interface TopicQ {
  question: string;
  options: Option[];
}

interface PartyScore {
  score: number;
  confidence: "grounded" | "fetched" | "estimated";
}

interface OptionResult {
  proposed: number[];
  current: number[];
  changed: boolean;
  perParty: Record<string, PartyScore>;
  sourceNotes: Record<string, string>;  // partyId → what evidence was used
}

type ProposedScores = Record<string, OptionResult>;

// ─── Env loading ──────────────────────────────────────────────────────────────

function loadEnvLocal() {
  const envPath = ".env.local";
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

// ─── HTML → plain text ────────────────────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Web fetch for grounding gaps ─────────────────────────────────────────────

async function tryFetchPageText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; election-research-bot/1.0)" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const text = htmlToText(html);
    return text.slice(0, 2000);  // first 2000 chars of page text
  } catch {
    return null;
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  topicLabel: string,
  optionText: string,
  parties: Party[],
  groundingsByParty: Record<string, GroundingEntry[]>,
  fetchedByParty: Record<string, string>,
): string {
  const partyIds = parties.map(p => p.id);

  let prompt = `## משימת דירוג: ${topicLabel}\n\n`;
  prompt += `**עמדת הבוחר:** "${optionText}"\n\n`;
  prompt += `## נתוני מפלגות:\n\n`;

  for (const party of parties) {
    const entries = groundingsByParty[party.id] ?? [];
    const fetched = fetchedByParty[party.id];

    prompt += `**${party.name}:**\n`;

    if (entries.length > 0) {
      for (const e of entries) {
        const contrary = e.contrary ? ` (מתנגד ל: ${e.contrary})` : "";
        prompt += `  • "${e.text}" [היבט: ${e.aspect}]${contrary}\n`;
      }
    } else if (fetched) {
      prompt += `  (ממשאבים באינטרנט): ${fetched.slice(0, 500)}\n`;
    } else {
      prompt += `  — אין נתוני מצע; דרג לפי ידיעתך הכללית על עמדות המפלגה בנושא זה.\n`;
    }
    prompt += "\n";
  }

  prompt += `## הנחיות דירוג:\n\n`;
  prompt += `דרג כל מפלגה לפי ה**התאמה** שלה לעמדת הבוחר:\n`;
  prompt += `+2 = תמיכה חזקה   +1 = תמיכה מסוימת   0 = ניטרלי/לא ברור\n`;
  prompt += `-1 = התנגדות מסוימת   -2 = התנגדות חזקה\n\n`;
  prompt += `השתמש בכל 5 הרמות. כשאין נתוני מצע — סמוך על ידיעתך הכללית על המפלגה.\n\n`;
  prompt += `**החזר JSON בלבד, ללא הסבר:**\n`;
  prompt += `{${partyIds.map(id => `"${id}": <מספר>`).join(", ")}}`;

  return prompt;
}

// ─── Claude scoring call ──────────────────────────────────────────────────────

async function scoreOption(
  client: Anthropic,
  prompt: string,
): Promise<Record<string, number>> {
  const response = await client.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 300,
    temperature: 0,
    system:
      "אתה אנליסט פוליטי מנוסה המתמחה במפלגות ישראל. " +
      "אתה מדרג את מידת ההתאמה של כל מפלגה לעמדה פוליטית נתונה, " +
      "על בסיס מצעים וציטוטים רשמיים שסופקו לך, ובהיעדרם — על בסיס ידיעתך הכללית על המפלגה. " +
      "החזר תמיד JSON תקני בלבד, ללא markdown.",
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in response: ${text}`);
  return JSON.parse(jsonMatch[0]) as Record<string, number>;
}

// ─── Markdown review document ─────────────────────────────────────────────────

function renderReviewDoc(
  allResults: ProposedScores,
  parties: Party[],
  questions: Record<string, TopicQ>,
): string {
  const partyNames = Object.fromEntries(parties.map(p => [p.id, p.name]));
  const partyIds = parties.map(p => p.id);
  const shortNames = parties.map(p => {
    const n = p.name;
    if (n.includes("ביתנו")) return "ביתנו";
    if (n.includes('חד"ש')) return 'חד"ש';
    if (n.includes("דמוקרטים")) return "דמוקרטים";
    if (n.includes("עוצמה")) return "עוצמה";
    if (n.includes("יהדות")) return "יהד\"ת";
    return n.slice(0, 8);
  });

  let doc = `# Election Assistant — סקירת ציונים אוטומטית\n\n`;
  doc += `**הופק:** ${new Date().toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}\n`;
  doc += `**מקור:** Claude Sonnet + נתוני מצעים מ-data/groundings/\n\n`;
  doc += `**מקרא:**\n`;
  doc += `- ✅ grounded — ציון על בסיס ציטוט ממצע\n`;
  doc += `- 🌐 fetched — ציון על בסיס תוכן שנשלף מהאתר\n`;
  doc += `- ⚠️ estimated — ציון על בסיס ידיעה כללית (לא ממצע)\n`;
  doc += `- 🔄 שינוי — הציון המוצע שונה מהנוכחי\n\n`;
  doc += `---\n\n`;

  const diffSummary: string[] = [];
  const weakDiff: string[] = [];

  for (const [topicId, topicLabel] of Object.entries(TOPIC_LABELS)) {
    const q = questions[topicId];
    if (!q) continue;

    doc += `## ${topicLabel}\n\n`;

    for (const opt of q.options) {
      const key = `${topicId}.${opt.id}`;
      const result = allResults[key];
      if (!result) continue;

      const changed = result.changed;
      doc += `### ${opt.text}\n\n`;

      // Score table
      const header = `| | ${shortNames.join(" | ")} |\n`;
      const sep    = `|---|${partyIds.map(() => "---").join("|")}|\n`;
      const currentRow = `| נוכחי | ${partyIds.map(id => {
        const idx = parties.findIndex(p => p.id === id);
        const s = result.current[idx];
        return s > 0 ? `+${s}` : `${s}`;
      }).join(" | ")} |\n`;

      const proposedRow = `| מוצע | ${partyIds.map(id => {
        const idx = parties.findIndex(p => p.id === id);
        const s = result.proposed[idx];
        const ps = result.perParty[id];
        const flag = !ps ? "" : ps.confidence === "grounded" ? "✅" : ps.confidence === "fetched" ? "🌐" : "⚠️";
        const changed = result.current[idx] !== s;
        return `${changed ? "**" : ""}${s > 0 ? `+${s}` : `${s}`}${flag}${changed ? "**🔄" : ""}`;
      }).join(" | ")} |\n`;

      doc += header + sep + currentRow + proposedRow + "\n";

      // Differentiation analysis
      const scores = result.proposed;
      const range = Math.max(...scores) - Math.min(...scores);
      const allPositive = scores.every(s => s >= 1);
      const allNegative = scores.every(s => s <= -1);
      if (range < 3) {
        const warn = `⚠️ **אבחנה חלשה** — טווח ${range} (${topicLabel}/${opt.id})`;
        doc += `> ${warn}\n\n`;
        weakDiff.push(`${topicLabel} → "${opt.text.slice(0, 50)}…" (טווח: ${range})`);
      } else if (allPositive) {
        doc += `> ⚠️ **כל המפלגות חיוביות** — שאלה זו אינה מבדילה בין מפלגות\n\n`;
        weakDiff.push(`${topicLabel} → "${opt.text.slice(0, 50)}…" (כל חיוביות)`);
      } else if (allNegative) {
        doc += `> ⚠️ **כל המפלגות שליליות** — שאלה זו אינה מבדילה בין מפלגות\n\n`;
        weakDiff.push(`${topicLabel} → "${opt.text.slice(0, 50)}…" (כל שליליות)`);
      }

      // Changes
      if (changed) {
        const changes = partyIds
          .map((id, i) => {
            const old = result.current[i];
            const neu = result.proposed[i];
            if (old === neu) return null;
            return `${partyNames[id]}: ${old > 0 ? `+${old}` : old} → ${neu > 0 ? `+${neu}` : neu}`;
          })
          .filter(Boolean);
        if (changes.length > 0) {
          diffSummary.push(`**${topicLabel}/${opt.id}:** ${changes.join(", ")}`);
          doc += `**שינויים מוצעים:** ${changes.join(" | ")}\n\n`;
        }
      }

      // Evidence notes for estimated scores
      const estimatedParties = partyIds.filter(id => result.perParty[id]?.confidence === "estimated");
      if (estimatedParties.length > 0) {
        doc += `_ציונים משוערים (ללא מצע רשמי): ${estimatedParties.map(id => partyNames[id]).join(", ")}_\n\n`;
      }
    }

    doc += "---\n\n";
  }

  // Summary sections
  doc += `## 📊 סיכום שינויים\n\n`;
  if (diffSummary.length === 0) {
    doc += `לא נמצאו שינויים מהציונים הנוכחיים.\n\n`;
  } else {
    doc += `${diffSummary.length} שינויים מוצעים:\n\n`;
    for (const d of diffSummary) doc += `- ${d}\n`;
    doc += "\n";
  }

  doc += `## ⚠️ שאלות עם אבחנה חלשה\n\n`;
  if (weakDiff.length === 0) {
    doc += `כל השאלות מבדילות היטב בין המפלגות.\n\n`;
  } else {
    doc += `${weakDiff.length} אפשרויות עם טווח ציונים נמוך — שקול לשכתוב:\n\n`;
    for (const w of weakDiff) doc += `- ${w}\n`;
    doc += "\n";
  }

  doc += `## ✏️ הערות סוקר\n\n`;
  doc += `_כתוב כאן כל הערה לאחר עיון בטבלאות_\n\n`;

  return doc;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadEnvLocal();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY not set. Add it to .env.local or set in environment.");
    process.exit(1);
  }

  // Dynamic imports (tsx handles ESM for us, but we need to load project modules)
  const { PARTIES } = await import("../lib/parties");
  const { QUESTIONS_FORMAL } = await import("../lib/questions");
  const { GROUNDINGS } = await import("../lib/groundings");

  const client = new Anthropic({ apiKey });
  const partyIds = PARTIES.map(p => p.id);
  const results: ProposedScores = {};

  console.log(`\n📊 Auto-scoring ${Object.keys(TOPIC_LABELS).length} topics × 4 options = ${Object.keys(TOPIC_LABELS).length * 4} calls\n`);

  // Pre-fetch pages for parties with gaps (one fetch per party, reused across topics)
  const fetchCache: Record<string, Record<string, string | null>> = {}; // partyId → topicId → text | null

  for (const [topicId, topicLabel] of Object.entries(TOPIC_LABELS)) {
    const q = QUESTIONS_FORMAL[topicId];
    if (!q) continue;

    console.log(`\n── ${topicLabel} ──`);

    // Gather gaps and fetch pages
    const fetchedByParty: Record<string, string> = {};
    for (const party of PARTIES) {
      const entries = (GROUNDINGS[party.id]?.topics[topicId] ?? [])
        .filter((e: GroundingEntry) => !e.absent && e.text.length > 0);

      if (entries.length === 0) {
        // Try to fetch from sourceUrl
        if (!fetchCache[party.id]) fetchCache[party.id] = {};
        if (fetchCache[party.id][topicId] === undefined) {
          const sourceUrl = GROUNDINGS[party.id]?.sourceUrl;
          if (sourceUrl && sourceUrl.startsWith("http")) {
            process.stdout.write(`  🌐 Fetching ${party.name} (${sourceUrl.slice(0, 50)}…) `);
            const text = await tryFetchPageText(sourceUrl);
            fetchCache[party.id][topicId] = text;
            console.log(text ? "✅" : "❌ failed");
          } else {
            fetchCache[party.id][topicId] = null;
          }
        }
        const fetched = fetchCache[party.id][topicId];
        if (fetched) fetchedByParty[party.id] = fetched;
      }
    }

    // Score each option
    for (const opt of q.options) {
      process.stdout.write(`  ${opt.id}… `);

      const groundingsByParty: Record<string, GroundingEntry[]> = {};
      for (const party of PARTIES) {
        groundingsByParty[party.id] = (GROUNDINGS[party.id]?.topics[topicId] ?? [])
          .filter((e: GroundingEntry) => !e.absent && e.text.length > 0);
      }

      const prompt = buildPrompt(topicLabel, opt.text, PARTIES, groundingsByParty, fetchedByParty);

      let rawScores: Record<string, number>;
      try {
        rawScores = await scoreOption(client, prompt);
      } catch (e) {
        console.log(`❌ ${e}`);
        continue;
      }

      // Clamp scores to [-2, +2] and build result
      const proposed: number[] = [];
      const perParty: Record<string, PartyScore> = {};
      const sourceNotes: Record<string, string> = {};

      for (const party of PARTIES) {
        const rawScore = rawScores[party.id] ?? 0;
        const score = Math.max(-2, Math.min(2, Math.round(rawScore)));
        const hasGrounding = (groundingsByParty[party.id] ?? []).length > 0;
        const hasFetched  = !!fetchedByParty[party.id];
        const confidence: "grounded" | "fetched" | "estimated" =
          hasGrounding ? "grounded" : hasFetched ? "fetched" : "estimated";

        proposed.push(score);
        perParty[party.id] = { score, confidence };
        sourceNotes[party.id] = hasGrounding
          ? `${groundingsByParty[party.id].length} grounding entries`
          : hasFetched ? "fetched from web" : "estimated from training";
      }

      const key = `${topicId}.${opt.id}`;
      results[key] = {
        proposed,
        current:  [...opt.scores],
        changed:  proposed.some((s, i) => s !== opt.scores[i]),
        perParty,
        sourceNotes,
      };

      const changes = proposed.filter((s, i) => s !== opt.scores[i]).length;
      console.log(`✅ (${changes} changes)`);

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Write proposed-scores.json
  writeFileSync("scripts/proposed-scores.json", JSON.stringify(results, null, 2), "utf-8");
  console.log("\n✅ Written: scripts/proposed-scores.json");

  // Write score-review.md
  const reviewMd = renderReviewDoc(results, PARTIES, QUESTIONS_FORMAL);
  writeFileSync("docs/score-review.md", reviewMd, "utf-8");
  console.log("✅ Written: docs/score-review.md");

  // Summary
  const totalChanges = Object.values(results).filter(r => r.changed).length;
  const totalEstimated = Object.values(results).reduce((n, r) =>
    n + Object.values(r.perParty).filter(p => p.confidence === "estimated").length, 0);
  console.log(`\n📊 Summary:`);
  console.log(`   Options with proposed changes: ${totalChanges} / ${Object.keys(results).length}`);
  console.log(`   Estimated scores (no grounding): ${totalEstimated}`);
  console.log(`\nNext step: review docs/score-review.md, then run:`);
  console.log(`   npx tsx --env-file .env.local scripts/apply-scores.ts`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
