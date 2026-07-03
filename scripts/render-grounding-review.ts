/**
 * Generates docs/advisor-review/grounding-review.html from data/groundings/*.json
 * (via lib/groundings.ts — the actual committed source of truth, not a snapshot).
 * Run: npm run export:grounding-review
 *
 * Renders every grounding entry's provenance (who wrote it) and concreteness
 * (how checkable the claim is), grouped by party and topic, for human review.
 * Re-run any time grounding data changes — nothing here is hand-maintained,
 * so it can never drift out of sync with data/groundings/*.json.
 */

import { writeFileSync, mkdirSync } from "fs";
import {
  GROUNDINGS,
  derivePartySourceQuality,
  type Provenance,
  type Concreteness,
} from "../lib/groundings";
import { PARTIES } from "../lib/parties";
import { TOPIC_LABELS, TOPICS } from "../lib/topics";

function e(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const PROVENANCE_META: Record<Provenance, { label: string; cls: string }> = {
  "official-current":  { label: "רשמי · עדכני",   cls: "p1" },
  "official-outdated": { label: "רשמי · מיושן",   cls: "p2" },
  "joint-list":         { label: "שותפה ברשימה",  cls: "p3" },
  "third-party":        { label: "צד שלישי",      cls: "p4" },
};

const CONCRETENESS_META: Record<Concreteness, { label: string; cls: string }> = {
  quantified:        { label: "כמותי",        cls: "c1" },
  "named-mechanism":  { label: "מנגנון בשם",   cls: "c2" },
  "specific-stance":  { label: "עמדה ברורה",   cls: "c3" },
  generic:            { label: "כללי",        cls: "c4" },
};

const SOURCE_QUALITY_LABEL: Record<string, string> = {
  official: "רשמי",
  outdated: "מיושן",
  thirdParty: "צד שלישי",
};

const PARTY_NAME: Record<string, string> = Object.fromEntries(
  PARTIES.map((p) => [p.id, p.subtitle ? `${p.name} (${p.subtitle})` : p.name])
);

// ─── Gather per-party data ─────────────────────────────────────────────────────

type Row = {
  topicId: string;
  text: string;
  provenance: Provenance;
  concreteness: Concreteness;
  sourceUrl: string;
};

const partyIds = Object.keys(GROUNDINGS).sort(
  (a, b) => (PARTIES.findIndex((p) => p.id === a)) - (PARTIES.findIndex((p) => p.id === b))
);

const parties = partyIds.map((partyId) => {
  const pg = GROUNDINGS[partyId];
  const rows: Row[] = [];
  for (const topicId of TOPICS.map((t) => t.id)) {
    for (const entry of pg.topics[topicId] ?? []) {
      if (entry.absent || !entry.text) continue;
      rows.push({
        topicId,
        text: entry.text,
        provenance: entry.provenance,
        concreteness: entry.concreteness,
        sourceUrl: entry.sourceUrl,
      });
    }
  }
  const provCounts: Record<Provenance, number> = {
    "official-current": 0, "official-outdated": 0, "joint-list": 0, "third-party": 0,
  };
  for (const r of rows) provCounts[r.provenance]++;
  return {
    partyId,
    name: PARTY_NAME[partyId] ?? partyId,
    platformLabel: pg.platformLabel ?? "",
    sourceQuality: derivePartySourceQuality(pg),
    rows,
    provCounts,
  };
});

const totalEntries = parties.reduce((s, p) => s + p.rows.length, 0);

function barHtml(counts: Record<Provenance, number>): string {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const segs = (Object.keys(PROVENANCE_META) as Provenance[])
    .filter((k) => counts[k] > 0)
    .map((k) => {
      const pct = (100 * counts[k] / total).toFixed(1);
      return `<span class="seg ${PROVENANCE_META[k].cls}" style="width:${pct}%" title="${PROVENANCE_META[k].label}: ${counts[k]}"></span>`;
    });
  return `<div class="bar">${segs.join("")}</div>`;
}

const summaryHtml = parties.map((p) => `
    <a class="sumrow" href="#p-${p.partyId}">
      <span class="sumname">${e(p.name)}</span>
      ${barHtml(p.provCounts)}
      <span class="sumcounts">${p.rows.length} ציטוטים</span>
      <span class="sumquality">${e(SOURCE_QUALITY_LABEL[p.sourceQuality])}</span>
    </a>`).join("");

const sectionsHtml = parties.map((p) => {
  const rowsHtml = p.rows.map((r) => {
    const pm = PROVENANCE_META[r.provenance];
    const cm = CONCRETENESS_META[r.concreteness];
    return `
            <tr>
              <td class="colTopic">${e(TOPIC_LABELS[r.topicId] ?? r.topicId)}</td>
              <td class="colText" dir="rtl">${e(r.text)}</td>
              <td class="colTier"><span class="chip ${pm.cls}">${pm.label}</span></td>
              <td class="colConc"><span class="subchip ${cm.cls}">${cm.label}</span></td>
              <td class="colDomain"><span class="domain" dir="ltr">${e(domainOf(r.sourceUrl))}</span></td>
            </tr>`;
  }).join("");

  return `
    <details class="party" id="p-${p.partyId}">
      <summary>
        <span class="partyname">${e(p.name)}</span>
        <span class="partylabel">${e(p.platformLabel)}</span>
        <span class="partyquality">${e(SOURCE_QUALITY_LABEL[p.sourceQuality])}</span>
        <span class="partycount">${p.rows.length} ציטוטים</span>
      </summary>
      <div class="tablewrap">
        <table>
          <thead><tr><th>נושא</th><th>ציטוט</th><th>מקור (provenance)</th><th>קונקרטיות</th><th>דומיין</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </details>`;
}).join("");

const page = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>סקירת מקורות עגינה — provenance × concreteness</title>
<style>
:root {
  --paper: #F1F2ED; --surface: #FFFFFF; --ink: #202523; --ink-soft: #55605A; --line: #DBDED4;
  --accent: #2F4A40; --accent-soft: #E4E9E4;
  --p1: #2F4A40; --p2: #5C7A6E; --p3: #8FA69B; --p4: #B79A72;
  --c1: #2F4A40; --c2: #5C7A6E; --c3: #8FA69B; --c4: #B0B6AE;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif; line-height: 1.55; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem; }
h1 { font-size: 1.6rem; font-weight: 700; margin: 0 0 0.4rem; }
.subtitle { color: var(--ink-soft); font-size: 0.95rem; max-width: 70ch; }
.legend { display: flex; flex-wrap: wrap; gap: 0.5rem 1.1rem; margin-top: 1.1rem; font-size: 0.8rem; color: var(--ink-soft); }
.legend .dot { display:inline-block; width:0.6rem; height:0.6rem; border-radius:2px; margin-left:0.4rem; vertical-align:-1px; }
.stats { display: flex; gap: 1.2rem; margin: 1.5rem 0 2rem; font-variant-numeric: tabular-nums; }
.stat { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 0.85rem 1.1rem; }
.stat .num { font-size: 1.5rem; font-weight: 700; color: var(--accent); display:block; }
.stat .label { font-size: 0.74rem; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.04em; }
.summarybox { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 0.4rem; margin-bottom: 2.2rem; }
.sumrow { display: grid; grid-template-columns: 10rem 1fr 6rem 5rem; align-items: center; gap: 1rem; padding: 0.65rem 0.9rem; text-decoration: none; color: var(--ink); border-radius: 8px; }
.sumrow:hover { background: var(--accent-soft); }
.sumname { font-weight: 600; font-size: 0.9rem; }
.bar { display: flex; height: 0.5rem; border-radius: 4px; overflow: hidden; background: var(--line); }
.bar .seg { display: inline-block; height: 100%; }
.seg.p1 { background: var(--p1); } .seg.p2 { background: var(--p2); } .seg.p3 { background: var(--p3); } .seg.p4 { background: var(--p4); }
.sumcounts, .sumquality { font-size: 0.75rem; color: var(--ink-soft); white-space: nowrap; }
details.party { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; margin-bottom: 1rem; overflow: hidden; }
summary { cursor: pointer; padding: 0.95rem 1.3rem; display: flex; align-items: center; gap: 0.8rem; font-weight: 600; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary::before { content: "▸"; color: var(--ink-soft); transition: transform 0.15s ease; font-size: 0.78rem; }
details[open] summary::before { transform: rotate(90deg); }
.partylabel { font-weight: 400; color: var(--ink-soft); font-size: 0.8rem; }
.partyquality { font-size: 0.76rem; color: var(--ink-soft); background: var(--accent-soft); padding: 0.15rem 0.55rem; border-radius: 999px; }
.partycount { margin-inline-start: auto; font-size: 0.76rem; color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.tablewrap { overflow-x: auto; border-top: 1px solid var(--line); }
table { border-collapse: collapse; width: 100%; font-size: 0.83rem; }
thead th { text-align: right; padding: 0.55rem 0.85rem; background: var(--accent-soft); color: var(--ink-soft); font-weight: 600; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; }
tbody tr { border-top: 1px solid var(--line); }
tbody tr:hover { background: #FAFAF7; }
td { padding: 0.6rem 0.85rem; vertical-align: top; }
.colTopic { white-space: nowrap; color: var(--ink-soft); font-size: 0.78rem; }
.colText { max-width: 34rem; }
.colTier, .colConc { white-space: nowrap; }
.colDomain { white-space: nowrap; }
.domain { font-family: ui-monospace, "SF Mono", Consolas, monospace; font-size: 0.7rem; color: var(--ink-soft); }
.chip { display: inline-block; padding: 0.16rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; color: white; white-space: nowrap; }
.chip.p1 { background: var(--p1); } .chip.p2 { background: var(--p2); } .chip.p3 { background: var(--p3); } .chip.p4 { background: var(--p4); }
.subchip { display: inline-block; padding: 0.14rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; border: 1.5px solid; white-space: nowrap; }
.subchip.c1 { color: var(--c1); border-color: var(--c1); } .subchip.c2 { color: var(--c2); border-color: var(--c2); }
.subchip.c3 { color: var(--c3); border-color: var(--c3); } .subchip.c4 { color: var(--c4); border-color: var(--c4); }
footer { margin-top: 2.5rem; font-size: 0.76rem; color: var(--ink-soft); }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>סקירת מקורות עגינה — provenance × concreteness</h1>
    <p class="subtitle">
      כל ציטוט מדורג בשני צירים בלתי-תלויים: <strong>provenance</strong> — מי כתב את המסמך
      (מפלגה עצמה עדכני/מיושן, שותפה ברשימה, או צד שלישי) — ו<strong>concreteness</strong> — עד כמה
      הטענה הספציפית ניתנת לבדיקה (כמותית ← מנגנון בשם ← עמדה ברורה ← כללי). נבנה ישירות מ־
      <code>data/groundings/*.json</code> דרך <code>lib/groundings.ts</code> — אין כאן נתון ידני,
      כך שהעמוד אף פעם לא יכול לצאת מסונכרן מהנתונים בפועל.
    </p>
    <div class="legend">
      <span><span class="dot" style="background:var(--p1)"></span>רשמי · עדכני</span>
      <span><span class="dot" style="background:var(--p2)"></span>רשמי · מיושן</span>
      <span><span class="dot" style="background:var(--p3)"></span>שותפה ברשימה</span>
      <span><span class="dot" style="background:var(--p4)"></span>צד שלישי</span>
    </div>
  </header>

  <div class="stats">
    <div class="stat"><span class="num">${totalEntries}</span><span class="label">סה"כ ציטוטים</span></div>
    <div class="stat"><span class="num">${parties.length}</span><span class="label">מפלגות</span></div>
  </div>

  <div class="summarybox">${summaryHtml}</div>

  ${sectionsHtml}

  <footer>נוצר אוטומטית מ־<code>data/groundings/*.json</code> על ידי <code>scripts/render-grounding-review.ts</code> (npm run export:grounding-review). הרץ מחדש אחרי כל שינוי בנתוני העגינה.</footer>
</div>
</body>
</html>
`;

mkdirSync("docs/advisor-review", { recursive: true });
writeFileSync("docs/advisor-review/grounding-review.html", page, "utf-8");
console.log("✅ Generated: docs/advisor-review/grounding-review.html");
console.log(`   ${parties.length} parties, ${totalEntries} entries`);
