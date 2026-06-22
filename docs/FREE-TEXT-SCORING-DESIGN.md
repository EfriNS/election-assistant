# Free-Text Scoring Design

**Status:** Decided (2026-06-22)
**Resolves:** TODO item #2 — scoring architecture for free-text inputs

---

## The Problem This Solves

Prototype E collects two kinds of free text from users:

1. **"Other" opener answers** — when a user selects "אחר — פרט" instead of one of the 4 fixed options per topic
2. **Follow-up answers** — both the structured option selections and any "other" answers within follow-ups

Today, **neither type affects the party scores.** A user who spends 10 minutes thoughtfully answering follow-up questions gets the exact same party ranking as one who answered only the opener question. The depth setting (בקצרה/בהרחבה) changes only the richness of the AI caption — not the accuracy of the match.

This is a product integrity problem. The tool implies personalization it isn't delivering. More concretely: two users who share the same high-level opener answer but hold clearly different positions on specific sub-issues can get the same party ranked #1, when the right answer for each of them is different.

---

## The Decision

**Follow-up answers and "other" opener answers must affect the party score.**

The mechanism: for any topic where the user expressed a position in free text, the system scores that topic by comparing the user's full stated position — opener plus all follow-ups — to each party's actual published platform text on that topic. An alignment score per party results from that comparison.

This is grounded in party platform data, not in the AI's general knowledge of Israeli politics. The AI receives verbatim platform quotes; its job is comparison, not political judgment.

---

## How It Works: Two Connected Parts

### Part 1 — Follow-up questions are redesigned to be party-differentiating

Currently follow-up questions are prompted to "go deeper on what the user said." This produces questions that feel relevant but often don't probe dimensions where parties actually differ — making the answers uninformative for scoring even if they were scored.

Under this design, the follow-up generation prompt receives:
- The user's opener answer (what we already know)
- Party platform positions on the key sub-dimensions of this topic (from the grounding data)
- The current score distribution for this user (so we know which parties are currently close)

The AI's task changes from **"go deeper"** to **"identify the sub-dimension of this topic where the parties currently close to this user most clearly differ — and which their opener answer didn't already reveal — then ask about that."**

**Why this matters:** Good follow-up questions do real work. They surface the specific aspect of a topic that would actually change the relative ranking of parties that are currently near-tied for this user. Bad follow-up questions collect more words that don't move any needle.

**Example:**
- User opener on security: "peace solution — only a political agreement breaks the cycle"
- Current close parties: הדמוקרטים (82%), ביחד (74%), ישר! (68%)
- Where these parties actually differ: הדמוקרטים supports an international peace framework; ביחד and ישר! prefer bilateral negotiations without international guarantors
- System asks: *"What role should international actors play in a peace process?"*
- User: *"International guarantors are essential — bilateral negotiations alone can't be trusted"*
- This distinguishes הדמוקרטים from ביחד/ישר! → match correctly surfaces הדמוקרטים as #1

Without this design: the same question might have been "how urgent is the peace process?" — which doesn't distinguish these parties at all.

### Part 2 — Topics with free text are scored against party platform data at results time

When the user completes all topics and requests their results, any topic that produced free text is scored in a single AI comparison call.

The call receives:
- The user's complete Q&A for each such topic (opener + all follow-ups)
- Verbatim platform quotes per party for each such topic (from `lib/groundings.ts`)

The AI outputs an alignment score (−2 to +2) per party per topic, grounded in the provided quotes. For parties with no published platform quote on a given topic, the score is `null` → the system falls back to the deterministic option-score matrix for that party on that topic.

Topics where the user chose a fixed opener option with no follow-ups are scored deterministically as today — no AI call needed.

---

## What "Hard Facts" Grounding Means Here

The original concern behind "AI is explanation only" was: don't let the AI generate party scores from its training-data knowledge of Israeli politics, which may be outdated, biased, or opaque.

This design preserves that protection:
- The AI receives only the platform texts we provide — it is explicitly instructed not to apply any other knowledge about these parties
- Every score the AI produces can be traced to a specific archived quote
- The grounding data is publicly archived (`docs/sources/<partyId>/`) and can be audited

The trust anchor shifts from "fixed option scores validated by an advisor" to "verbatim party platform text with source URL and archive date, validated by an advisor." This is strictly stronger grounding, not weaker.

**Updated invariant:** *"Party scores are grounded in expert-reviewed platform data. For topics with free-text input, AI compares user answers to provided party platform texts — it does not apply political judgment or draw on any knowledge beyond what is provided."*

---

## User Journey: Before and After

**Before (broken):**
1. User marks housing as "critical"
2. Opener: picks "market solutions, remove barriers"
3. Follow-up (depth=deep): "On high rents — should the priority be rent caps or more construction?"
4. User: *"Some targeted rent caps short-term, but more construction is the real answer"*
5. Results: same ranking as a pure free-market voter who answered only the opener
6. The AI blurb says something plausible about ביחד, but the ranking behind it ignored Step 4

**After (honest):**
1–3 same
4. User: same answer
5. System compares this to ביחד's platform ("reducing regulation to enable building") and הדמוקרטים's platform ("temporary rent controls in major cities while supply catches up") — user's position is closer to הדמוקרטים on this sub-dimension
6. Match updates: הדמוקרטים closes the gap with ביחד; result reflects actual nuance
7. The grounding block in results shows the quote that drove the scoring — user can verify

---

## What This Connects To

This design and the grounding layer (Phase 0.3 — showing verbatim quotes in results) use the same underlying data and are best built together. The party platform data collected in Phase 0.2 is the prerequisite for both:

- **Scoring**: "Compare user answer to this party's quote → alignment score"
- **Grounding UX**: "Show user this party's quote → 'מה כתוב במצע'"

These are two views of the same data. Collecting the data and using it for scoring and display are one unified task.

---

## Data Requirements

The grounding data model (already decided, PHASED-ROADMAP.md §4):

```typescript
type GroundingEntry = {
  text: string;           // verbatim quote from platform
  aspect: string;         // the sub-dimension this quote addresses (e.g., "tenant protection", "supply-side reform")
  sourceUrl: string;      // URL to the original document
  archivePath: string;    // path in docs/sources/<partyId>/
  dateRetrieved: string;  // ISO date
  contrary?: string;      // a position the party explicitly opposes
  absent?: boolean;       // no known position on this sub-dimension
}
```

The `aspect` field is load-bearing for this design — it labels the sub-dimension so the follow-up generation can say "we've already covered aspect X; what's the next discriminating dimension." The advisor review (Phase 0.1) should define 2–4 key aspects per topic to guide both platform data collection and follow-up question design.

---

## What Stays the Same

- The tappable-card question UI, "other" text input, prologue transitions — unchanged
- Topics where the user chose a fixed opener with no follow-ups: deterministic scoring, no AI call
- The `calcResults` logic (weighted scores → percentage)
- The `UnifiedResultsPage` component
- The `/api/results` route for profile summary and party blurbs
- The overall flow: priorities → questions → close → results
- Graceful degradation when Gemini is unavailable: show deterministic-only results

---

## Open Questions

**1. Party name visibility in the scoring prompt**
Should the AI be told party names, or anonymized ("Party 1", "Party 2")? Naming parties gives context; anonymizing prevents training-data contamination. Recommendation: name parties, but explicitly instruct: *"Score based only on the provided platform text. Do not apply any other knowledge about these parties."*

**2. Scoring failure disclosure**
When AI scoring is unavailable (quota), the follow-up answers have no effect on the match. The degradation message should note this honestly: *"Due to high demand, your detailed responses were not scored — results show your top-level answers only."*

**3. Advisor sub-dimension definitions**
The quality of follow-up questions depends on the aspect taxonomy defined in Phase 0.1. The advisor review packet should explicitly ask: "For each topic, what are the 2–3 sub-dimensions where parties most clearly diverge?" This becomes the scaffold for both question generation and grounding data collection.
