// Pure builders for /api/score-topics — the prompt text and the structured-output
// schema. Kept apart from the route so tests and scripts can use them without
// loading the route's server-only dependencies (Next, Langfuse instrumentation).
import { PARTIES } from "@/lib/parties";
import { compareEntryQuality, entryAspects, getBestEvidenceForAspect, getBestEvidenceForTopic, type GroundingEntry } from "@/lib/groundings";
import { TOPIC_KEY_DIMENSIONS } from "@/lib/questions";

// targetedAspect: the sub-dimension the follow-up question probed (set by /api/follow-up).
// options: the answer options as the user saw them, in display order (the UI numbers them).
export type FollowUpQA = { question: string; answer: string; targetedAspect?: string; options?: string[] };

export type TopicQAForScoring = {
  topicId: string;
  topicLabel: string;
  openerQuestion: string;
  openerAnswer: string;
  followUpQA: FollowUpQA[];
  freeTextInterpretation?: string;
  openerIsFreeText?: boolean;
  // The opener's options in the order the user saw them (shuffled per session, numbered in the UI).
  openerOptions?: string[];
};

// The UI numbers every option, and free-text answers refer to those numbers
// ("3+1", "like 1 but…"). Without the list the model can only guess what a
// number meant — a real 2026-10-12 run read "3+1" as a hawkish stance.
function shownOptions(options?: string[]): string {
  if (!options || options.length === 0) return "";
  return `\n  אפשרויות שהוצגו למשתמש (ממוספרות כפי שראה אותן): ${options.map((o, i) => `${i + 1}. ${o}`).join(" | ")}`;
}

/**
 * The sub-dimensions a topic's follow-up answers are about, or null when the
 * whole topic is in play: a free-text opener (the AI score then stands in for
 * the opener score, which is about the topic as a whole), no follow-ups, or a
 * follow-up without a canonical targetedAspect (e.g. a quiz session that
 * started before the client sent it).
 */
export function getScoringAspects(t: TopicQAForScoring): string[] | null {
  if (t.openerIsFreeText || t.followUpQA.length === 0) return null;
  const canonical = TOPIC_KEY_DIMENSIONS[t.topicId] ?? [];
  const aspects = t.followUpQA.map((fq) => fq.targetedAspect);
  if (!aspects.every((a): a is string => typeof a === "string" && canonical.includes(a))) return null;
  return [...new Set(aspects)];
}

/**
 * The party texts the model scores a topic against: for each sub-dimension the
 * follow-ups probed, the party's best evidence on it (official-first per
 * sub-dimension, see getBestEvidenceForAspect). Sending the whole topic made
 * the prompt ~3x longer after the 2026-10 full harvest and the scores
 * measurably noisier (scripts/compare-scoring.ts).
 */
export function getScoringEntries(partyId: string, t: TopicQAForScoring): GroundingEntry[] {
  const aspects = getScoringAspects(t);
  if (!aspects) return getBestEvidenceForTopic(partyId, t.topicId);
  // An entry can address several probed sub-dimensions — send it once.
  const entries = new Set(aspects.flatMap((a) => getBestEvidenceForAspect(partyId, t.topicId, a)));
  return [...entries].sort(compareEntryQuality);
}

// scores[topicId][partyId] = number (-2..+2) | null (no platform data)
export type ScoreTopicsResult = Record<string, Record<string, number | null>>;

// Structured-output schema, built per-request from the exact topic×party
// keys the prompt asks for. `enum` constrains each value to the 5 valid
// score integers or null — this is what guarantees the model can't emit
// `+2` (invalid JSON number syntax) the way it occasionally did under plain
// responseMimeType, and `required` guarantees every key is present so a
// party/topic can't be silently dropped from the response.
export function buildScoreResponseSchema(topics: TopicQAForScoring[]) {
  const properties: Record<string, { type: string[]; enum: (number | null)[] }> = {};
  for (const t of topics) {
    for (const party of PARTIES) {
      properties[`${t.topicId}.${party.id}`] = {
        type: ["integer", "null"],
        enum: [-2, -1, 0, 1, 2, null],
      };
    }
  }
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
  };
}

export function buildScoringPrompt(topics: TopicQAForScoring[]): string {
  const userBlock = topics
    .map((t) => {
      let block = `[${t.topicLabel}] ${t.openerQuestion}`;
      if (t.openerIsFreeText) block += shownOptions(t.openerOptions);
      block += `\nתשובה: ${t.openerAnswer}`;
      if (t.freeTextInterpretation) {
        block += `\n  פרשנות: ${t.freeTextInterpretation}`;
      }
      t.followUpQA.forEach((fq) => {
        block += `\n  שאלת המשך: ${fq.question}${shownOptions(fq.options)}\n  תשובה: ${fq.answer}`;
      });
      return block;
    })
    .join("\n\n");

  const groundingBlock = topics
    .map((t) => {
      const partyLines = PARTIES.map((party) => {
        const entries = getScoringEntries(party.id, t);
        if (entries.length === 0) return null;
        return entries
          .map((e) => `  ${party.name} (היבט: ${entryAspects(e).join(", ")}): "${e.text}"`)
          .join("\n");
      }).filter(Boolean);

      if (partyLines.length === 0) return null;
      return `[${t.topicLabel}]\n${partyLines.join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");

  // No blanket exclusion of parties flagged platformAvailable: false (user decision
  // 2026-10-12): they are scored on whatever text they have, like everyone else.
  // Excluding them left a free-text topic with no score at all for those parties,
  // so their overall percentage was computed over fewer topics and could reach 100%.

  return `אתה מדרג את ההתאמה בין עמדות פוליטיות של משתמש לבין טקסטים מפורסמים של מפלגות ישראליות.

**כללים:**
- דרג אך ורק על סמך הטקסטים המסופקים להלן. אל תשתמש בידע כלשהו על המפלגות מעבר למה שמופיע כאן.
- אם לא סופק טקסט עבור מפלגה מסוימת בנושא מסוים — הוצא null עבורה בנושא זה.
- תשובה בטקסט חופשי עשויה להפנות לאפשרויות שהוצגו למשתמש לפי מספרן (למשל "3+1" או "דומה ל-1") — פרש אותה לפי רשימת האפשרויות שמופיעה מעל אותה תשובה, ולא לפי ניחוש.

**סולם הדירוג (מספרים בלי סימן +):**
2 = התאמה חזקה   1 = התאמה מסוימת   0 = ניטרלי / לא ברור
-1 = סתירה מסוימת  -2 = סתירה חזקה

---

**עמדות המשתמש:**
${userBlock}

---

**טקסטים מפלגתיים:**
${groundingBlock || "(אין טקסטים זמינים — החזר null לכל המפלגות בכל הנושאים)"}

---

**פורמט תוצאה — JSON בלבד, ללא markdown:**
{
${topics.map((t) => PARTIES.map((p) => `  "${t.topicId}.${p.id}": <מספר_או_null>`).join(",\n")).join(",\n")}
}`;
}
