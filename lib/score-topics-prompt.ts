// Pure builders for /api/score-topics — the prompt text and the structured-output
// schema. Kept apart from the route so tests and scripts can use them without
// loading the route's server-only dependencies (Next, Langfuse instrumentation).
import { PARTIES } from "@/lib/parties";
import { GROUNDINGS, getBestEvidenceForTopic } from "@/lib/groundings";

export type FollowUpQA = { question: string; answer: string };

export type TopicQAForScoring = {
  topicId: string;
  topicLabel: string;
  openerQuestion: string;
  openerAnswer: string;
  followUpQA: FollowUpQA[];
  freeTextInterpretation?: string;
};

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
      let block = `[${t.topicLabel}] ${t.openerQuestion}\nתשובה: ${t.openerAnswer}`;
      if (t.freeTextInterpretation) {
        block += `\n  פרשנות: ${t.freeTextInterpretation}`;
      }
      t.followUpQA.forEach((fq) => {
        block += `\n  שאלת המשך: ${fq.question}\n  תשובה: ${fq.answer}`;
      });
      return block;
    })
    .join("\n\n");

  const groundingBlock = topics
    .map((t) => {
      const partyLines = PARTIES.map((party) => {
        // Official material only when it exists; third-party/joint-list sources
        // are used only as a fallback for parties with no official platform text.
        const entries = getBestEvidenceForTopic(party.id, t.topicId);
        if (entries.length === 0) return null;
        return entries
          .map((e) => `  ${party.name} (היבט: ${e.aspect}): "${e.text}"`)
          .join("\n");
      }).filter(Boolean);

      if (partyLines.length === 0) return null;
      return `[${t.topicLabel}]\n${partyLines.join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");

  // Determine which parties have no platform data at all, for the null instruction
  const partiesWithoutPlatform = PARTIES.filter(
    (p) => !GROUNDINGS[p.id]?.platformAvailable
  ).map((p) => p.name);

  return `אתה מדרג את ההתאמה בין עמדות פוליטיות של משתמש לבין טקסטים מפורסמים של מפלגות ישראליות.

**כללים:**
- דרג אך ורק על סמך הטקסטים המסופקים להלן. אל תשתמש בידע כלשהו על המפלגות מעבר למה שמופיע כאן.
- אם לא סופק טקסט עבור מפלגה מסוימת בנושא מסוים — הוצא null עבורה בנושא זה.
- מפלגות ללא מצע: ${partiesWithoutPlatform.join(", ")} — null בכל הנושאים.

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
