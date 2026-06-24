#!/usr/bin/env tsx
/**
 * Applies approved scores from scripts/proposed-scores.json to lib/questions.ts.
 * Run AFTER reviewing docs/score-review.md.
 *
 * Run:
 *   npx tsx scripts/apply-scores.ts              -- preview changes (dry-run)
 *   npx tsx scripts/apply-scores.ts --apply       -- write to lib/questions.ts
 */

import { readFileSync, writeFileSync } from "fs";

const DRY_RUN = !process.argv.includes("--apply");

if (DRY_RUN) {
  console.log("🔍 DRY RUN — no files will be changed. Pass --apply to write.\n");
}

// ─── Load proposed scores ──────────────────────────────────────────────────────

const proposed = JSON.parse(
  readFileSync("scripts/proposed-scores.json", "utf-8")
) as Record<string, { proposed: number[]; current: number[]; changed: boolean }>;

const changed = Object.entries(proposed).filter(([, v]) => v.changed);

if (changed.length === 0) {
  console.log("✅ No changes to apply — proposed scores match current scores.");
  process.exit(0);
}

console.log(`Found ${changed.length} options with proposed score changes:\n`);

// ─── Patch lib/questions.ts ────────────────────────────────────────────────────

let source = readFileSync("lib/questions.ts", "utf-8");

let appliedCount = 0;
let skippedCount = 0;

for (const [key, result] of changed) {
  const [topicId, optionId] = key.split(".");
  const currentScoresStr = `[${result.current.join(", ")}]`;
  const proposedScoresStr = `[${result.proposed.join(", ")}]`;

  // Find all occurrences of this score array in the file
  // The array must appear in a block near the option id to avoid false matches
  // Strategy: find "id: \"<optionId>\"" then find the next "scores:" and replace that array
  const optionPattern = new RegExp(
    `(id:\\s*"${optionId}"[\\s\\S]*?scores:\\s*)\\[${result.current.map(n => String(n).replace(/-/g, "\\-")).join(",\\s*")}\\]`,
    "g"
  );

  const matches = [...source.matchAll(optionPattern)];
  if (matches.length === 0) {
    console.log(`  ⚠️  ${topicId}/${optionId}: could not locate scores array in source — skipping`);
    skippedCount++;
    continue;
  }

  if (DRY_RUN) {
    const changeList = result.current
      .map((old, i) => old !== result.proposed[i] ? `[${i}]: ${old > 0 ? '+' : ''}${old} → ${result.proposed[i] > 0 ? '+' : ''}${result.proposed[i]}` : null)
      .filter(Boolean);
    console.log(`  📝 ${topicId}/${optionId}: ${changeList.join(", ")}`);
    console.log(`     current:  ${currentScoresStr}`);
    console.log(`     proposed: ${proposedScoresStr}`);
  }

  // Replace ALL occurrences (both FORMAL and PERSONAL registers share the same array)
  source = source.replaceAll(
    new RegExp(
      `(id:\\s*"${optionId}"[\\s\\S]*?scores:\\s*)\\[${result.current.map(n => n < 0 ? `\\${n}` : String(n)).join(",\\s*")}\\]`,
      "g"
    ),
    `$1${proposedScoresStr}`
  );
  appliedCount++;
}

if (DRY_RUN) {
  console.log(`\n${appliedCount} options would be updated, ${skippedCount} skipped.`);
  console.log("Run with --apply to write changes.");
} else {
  writeFileSync("lib/questions.ts", source, "utf-8");
  console.log(`\n✅ Applied ${appliedCount} score updates to lib/questions.ts`);
  if (skippedCount > 0) {
    console.log(`⚠️  ${skippedCount} options skipped (score array not found — check manually)`);
  }
  console.log("\nNext: run 'npm test' to verify no regressions, then review the git diff.");
}
