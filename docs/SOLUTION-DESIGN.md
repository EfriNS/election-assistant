# Election Assistant — Solution Design

**Status**: User testing phase (all 4 prototypes live at election-assistant-snowy.vercel.app)
**Last updated**: 2026-06-16

---

## Design Philosophy

The product requirements already resolved the highest-level question: the interaction model is **hybrid** (structured quiz engine + AI explanation layer, not freeform chatbot). See `REQUIREMENTS.md` for the full rationale.

What remains open — and what the prototypes are designed to test — is **how questions are asked**. This is the single highest-leverage UX decision, because it determines:
- Whether users trust the tool (auditability)
- Whether users complete it (friction)
- Whether results feel personal (relevance)
- Whether the advisor can validate the logic (domain validity)

---

## The 4 Prototypes

Each prototype tests a distinct question-asking model. All share the same underlying principles:
- Hebrew, RTL layout
- Hybrid model: deterministic matching + AI explanation
- Show more than one result; "why" backed by verbatim quotations
- Non-partisan framing

### A — הצהרות (Statements Quiz)

**Model**: 25–30 ideological statements; user marks agree / neutral / disagree (or a 5-point scale). Linear flow with progress bar. No AI in the question phase.

**Results**: Ranked bar chart of party match %, expandable "why" showing exactly which statements you agreed/disagreed on.

**Character**: Clinical, auditable, serious. The international gold standard (Wahl-O-Mat, Vote Compass).

**Tests**: Whether Israeli users accept this format, or find it cold / too political-science-y.

**Expected time**: ~8 min

---

### B — עדיפויות (Priority-First)

**Model**: Step 1 — user rates importance of 8–10 topic areas (security, economy, housing, religion & state, etc.) on a slider. Step 2 — answer 4–5 questions on top 3 topics; single question on the rest.

**Results**: Match weighted by stated priorities. "Your match was driven mainly by shared views on security and the economy."

**Character**: Personalized, efficient. Users who care deeply about one topic feel heard.

**Tests**: Whether the priority-weighting step is empowering (users shape their own quiz) or friction (too many steps before getting to the questions). Also tests if mandatory importance weighting (vs. optional, as in most tools) improves perceived accuracy — academic research says it does.

**Expected time**: 5–15 min (user-controlled)

---

### C — דילמות (Dilemmas)

**Model**: Concrete real-world trade-off scenarios instead of abstract ideological statements. E.g.: *"הממשלה צריכה לבחור: לבנות שכונות ציבוריות גדולות, או לסבסד רוכשי דירה ראשונה בשוק החופשי. מה עדיף?"*

**Results**: Match based on revealed policy preferences, not declared ideology.

**Character**: Accessible, concrete, non-threatening. Good for users who "don't follow politics" but have opinions on real issues.

**Tests**: Whether concrete framing is more usable for politically disengaged voters — or whether it feels oversimplified for informed ones. Also tests scenario-writing difficulty (requires more editorial work to be neutral).

**Expected time**: ~10 min

---

### D — שיחה (AI Conversation)

**Model**: Feels like texting a knowledgeable friend. AI asks questions in natural language, adapts follow-ups, summarizes the user's position after each topic for correction. A structured rubric runs underneath — the AI never makes up party positions.

**Results**: Narrative explanation + ranked parties. More personal than a bar chart.

**Character**: Warm, human, engaging. The highest-friction for building, but potentially the most compelling for users.

**Tests**: Whether users trust this format on political topics (academic research says they trust it *less* — important to validate empirically), and whether the advisor is confident the structured rubric is captured correctly even without visible question structure.

**Expected time**: 10–15 min (variable)

**AI**: Google Gemini free tier (`gemini-3.5-flash`). Structured rubric kept in system prompt; party platform data passed as context. AI cannot deviate from provided data.

---

## What Varies Between Prototypes (Summary)

| Dimension | A | B | C | D |
|---|---|---|---|---|
| Question format | Binary/scale statements | Priority sliders → questions | Scenario trade-offs | Natural language |
| User control | Low (fixed set) | High (weights topics) | Low (fixed set) | Medium (can redirect) |
| Auditability | High | High | Medium | Low |
| Accessibility (non-political users) | Low | Medium | High | High |
| AI involvement in question phase | None | None | None | Full |
| Editorial burden | Medium | Medium | High (neutral scenarios) | Medium |
| Build complexity | Low | Medium | Low | High |

---

## Technical Stack

### Framework
**Next.js (React)** — chosen for:
- App Router with per-route pages (one route per prototype)
- Server components for data (party platform data never sent unnecessarily to client)
- RTL support via CSS `dir="rtl"` at layout level
- Vercel-native (zero config deployment)

### Hosting
**Vercel** — already connected to `EfriNS/election-assistant` on GitHub.
- Push to `main` → production deploy (`election-assistant-snowy.vercel.app`)
- Push to feature branch → preview URL (shareable for user testing)

### AI (Prototype D)
**Google Gemini free tier** via `@google/genai` npm package v2.8.0.
- Model: `gemini-3.1-flash-lite` (switched from `gemini-3.5-flash` which has RPD=20 on free tier; lite has RPD=500, RPM=10 — sufficient for prototype testing)
- `maxOutputTokens: 2000` (600 caused truncation mid-sentence)
- API key: `GEMINI_API_KEY` env var (`.env.local` locally, Vercel env var in production)
- API shape: `ai.chats.create({model, history, config: {systemInstruction}})` then `chat.sendMessage({message})`

### Key env vars
```
GEMINI_API_KEY=AIza...   # Google AI Studio free API key
```

---

## Rejected Approaches

### Lovable
- Free tier limited to ~5 projects and a monthly message cap — not enough for 4 distinct prototypes with Hebrew RTL
- Vendor lock-in: output hard to evolve into the final product
- Poor control over RTL layouts and custom quiz interaction patterns

### Claude.ai Project / "Skill"
- Requires users to have a Claude.ai account → immediate barrier for general public distribution
- No reproducible results: two users with identical values could get different match outputs depending on how their conversation unfolded — a voting tool must be explainably consistent
- No data collection: can't see aggregate response patterns, essential for improving the tool
- **Useful for**: internal testing and for the advisor to validate the question logic before exposing to users

### Freeform chatbot as primary interface
- Already ruled out in `REQUIREMENTS.md`. Summary: inconsistency, opacity, hallucination risk, and academic evidence that users specifically distrust chatbot-style VAAs on political topics.

---

## Open Questions (Post-Prototype)

After user testing, the following decisions will be made:

1. **Which prototype model wins?** (or which combination — e.g., A for desktop, D for mobile)
2. **Question count**: Research says 30–35 optimal. Does prototype testing confirm this?
3. **Tone/formality**: Should users choose (formal/casual)? Or infer from context?
4. **Results format**: Bar chart (A) vs. narrative (D) vs. something else — which builds more trust?
5. **Depth dial**: Should any prototype include the "quick pass → invite to go deeper" mechanic?
6. **Coalition modeling**: Unique differentiator — which prototype surface does it fit best?

---

---

## User Testing Round 1 — Design Refinements (2026-06-16)

After initial feedback from 2 users (see `docs/user-testing/round-1-feedback.md`), the following decisions were made for the next prototype iteration.

### AI Error Handling (Prototype D)

**Decision**: Return structured error codes from the API route; render human-friendly Hebrew messages in the UI.

**Problem**: The Gemini SDK throws errors whose `.message` contains the raw API JSON response (e.g., the full 429 payload). This was passed directly to the UI, showing a wall of technical JSON to the user — at the worst possible moment (just before getting results).

**Implementation**: `route.ts` inspects the error and returns `{ errorCode: "QUOTA_EXCEEDED" | "SERVER_ERROR" | ... }`. The client renders a friendly Hebrew message per code.

**Rejected**: Passing raw error strings to the client (current state) — leaks internal API detail and is incomprehensible to users.

---

### AI Quota / Budget Strategy (Prototype D)

**Decision**: Turn limit with automatic synthesis trigger (Option A).

**Problem**: A user hit the Gemini free-tier daily request quota mid-conversation, right before receiving results — the most frustrating possible failure point. The free tier quota is shared across all users with no per-user enforcement.

**Note on model**: `gemini-3.5-flash` is valid and was used initially (designed for agentic use, 1M token context, RPD=20 free tier). Switched to `gemini-3.1-flash-lite` (RPD=500) after confirming the 20 RPD limit was exhausted by 2 users in a single day of testing.

**Options considered**:

| Option | Description | Verdict |
|--------|-------------|---------|
| **A — Turn limit + auto-synthesis** | Cap at 8 user turns; on turn 8 the AI is prompted to synthesize and rank. User always gets results; usage is predictable (≤9 calls/session). | **Chosen** |
| B — Per-IP daily limit | Track requests per IP in a KV store; block after N sessions. | Rejected for now — adds infrastructure, doesn't fix mid-conversation cutoff, easily circumvented |
| C — User's own account (Gem / BYOK) | Redirect to a Gemini Gem, or require user to paste an API key. | Rejected — too much friction for general public; removes embedded UX |
| D — Drop AI chat | Remove Prototype D from testing. | Rejected — AI chat had the highest engagement; valuable to keep testing |

**Rationale**: Option A is the only zero-infrastructure approach that guarantees the user reaches the results step. It also makes the conversation feel structured rather than open-ended, which may improve completion rates. Option B is the natural next layer when distributing widely.

**Revisit when**: Wider distribution — add per-IP limiting (Option B) on top of the turn limit at that point. Longer term, evaluate paid tier if costs are predictable.

---

### Topic Selection Clarity (Prototype B)

**Decision**: Live counter + contextual "המשך" button state.

**Problem**: User 1 selected exactly 3 topics and stopped, not realizing she could (and should) select more. She read "at least 3" as "exactly 3."

**Implementation**:
- Subtitle copy updated: explicitly states "ככל שתבחרי יותר נושאים, כך התוצאה תהיה מדויקת יותר"
- Live counter below the grid: "בחרת 3 נושאים — ניתן לבחור עוד"
- "המשך" button disabled with reason text ("בחר עוד [N] נושאים") until ≥3 selected

---

### Terminology Hints (Prototypes A, C)

**Decision**: Info icon (?) next to unfamiliar terms, expanding an inline one-line definition on tap.

**Problem**: User 2 (age 16–18) did not understand terms like "כלכלת שוק", "מדינת רווחה". Without context, these force guessing or create anxiety that may cause drop-off.

**Options considered**:

| Option | Description | Verdict |
|--------|-------------|---------|
| **A — Info icon (?)** | Small "?" next to the term; tap reveals a one-line Hebrew definition inline. Touch-friendly, doesn't interrupt flow. | **Chosen** |
| B — Tap the term | Dotted underline on the term; tap expands definition below. | Good alternative; slightly less discoverable |
| C — Glossary page | Help link at the top; takes user to a separate page. | Rejected — breaks the flow, adds navigation friction |

**Rationale**: Option A is universally recognizable, works on mobile and desktop, and keeps the definition in context without navigating away.

---

### Priority Ranking UX (Prototype B)

**Decision**: Replace strict ordered ranking with importance buckets — implemented as a segmented button row per topic.

**Problem**: Strict rank ordering ("drag to 1st, 2nd, 3rd…") forces false precision. A topic ranked 3rd vs. 4th may matter equally; the forced order adds noise to the matching signal.

**User insight (User 1)**: Intuitively preferred placing topics in named importance levels over sorting them in sequence. Her mental model was drag-and-drop columns.

**Options considered**:

| Option | Description | Verdict |
|--------|-------------|---------|
| **A — Segmented button row** | Each topic has 4 labeled buttons (קריטי / חשוב מאוד / חשוב / פחות חשוב) inline. Tap to assign. | **Chosen** |
| B — Drag-and-drop columns | User 1's original mental model. | Rejected — complex to implement, poor mobile UX |
| C — Slider per topic | Used in an earlier prototype. | Rejected — imprecise on mobile; semantic meaning of positions unclear without labels |

**UX details**:
- All topics start unassigned (no default bucket)
- "פחות חשוב" is an explicit fourth bucket, visually de-emphasized (muted color/weight) to distinguish from "unassigned"
- Gate: "המשך" requires ≥3 topics assigned to "חשוב" or above
- Matching weights: קריטי=4, חשוב מאוד=3, חשוב=2, פחות חשוב=1, unassigned=0

---

## Unified Results Design (2026-06-17)

### The Problem

The four prototypes produced two incompatible results experiences:

- **A / B / C (quiz-based)**: Deterministic scoring → ranked party cards with score %, description, and links. Trustworthy and auditable, but impersonal. The results page has no memory of *why* the user answered as they did.
- **D (AI conversation)**: Free-form narrative in a chat bubble. Personalized and contextualized, but non-deterministic, visually inconsistent, and no external links.

Both have distinct value. The question is how to combine them.

---

### Design Principle: Two Separate Jobs

**Deterministic = trust anchor.** Every percentage number, every ranking, every party link must be computed by the matrix and never touched by the AI. This is what users can audit and compare with others.

**AI = meaning-making.** The AI's job is exclusively to explain *why* — to connect the user's specific stated values to why a party ranked higher or lower. It does not score; it narrates.

---

### Options Considered

| Option | Description | Verdict |
|--------|-------------|---------|
| **1 — AI micro-blurbs on existing cards** | After scoring, call AI once to generate a 1-2 sentence "why this fits you" per top-3 card. Party scores remain deterministic. | Simpler MVP, chosen for prototype stage |
| **2 — Unified Results Component** | Shared `<UnifiedResultsPage>` with: AI profile summary (above), deterministic party cards (with AI micro-blurb per top-3), methodology disclaimer (below). | **Chosen — best balance for prototype** |
| **3 — D emits structured output** | Instruct the AI in D to end with a JSON score block; parse client-side; render same party cards. D's scores would be AI-generated, not deterministic. | Right long-term direction, not prototype-ready |

---

### Decision: Option 2 — Unified Results Component

**Implementation** (`components/UnifiedResultsPage.tsx`):

```
[AI PROFILE SUMMARY]       ← indigo box, loads async after mount
  "על פי תשובותיך, אתה מדגיש..."

[PARTY CARDS — deterministic]
  #1 ביחד — 78%            ← score from matrix, not AI
  ▓▓▓▓▓▓▓▓░░
  "מרכז — ממשל נקי..."
  ✦ "הצבעות שלך על גיוס ונישואין..."  ← AI micro-blurb (top 3 only)
  אתר ↗   מצע ↗

  #2 הדמוקרטים — 71%
  ...

[METHODOLOGY DISCLAIMER]   ← bottom, static
  "הציון מבוסס על הערכה ידנית..."
```

**What's always deterministic:** scores, rankings, all external links.
**What's always AI:** profile summary paragraph, per-party micro-blurbs (1-2 sentences).
**Degradation:** if AI call fails, cards still show normally with no blurbs. No error shown to user.

**API route**: `POST /api/results` receives `{ answersSummary: string, topParties: [{id, name, score}] }`, returns `{ profile: string, partyBlurbs: { [partyId]: string } }`.

**Answer summary format per prototype:**
- A (statements): `"[topic]: "[statement]" — [agree/disagree]"` per answered question
- B (priorities): `"[topic] ([bucket]): [chosen concern text]"` sorted by weight
- C (dilemmas): `"[topic]: [option label] — [option text]"` per answered dilemma

---

### Prototype D — Current State and Future Direction

Prototype D is **left unchanged** for now — the chat UI is its own UX experiment and conflating it with the structured results would blur what's being tested.

**Longer-term direction (post-prototype, close to Option 3):** When a winner is chosen, D's final turn would emit structured data matching the Option 2 format exactly: deterministic-equivalent scores (from the AI's internal rubric), micro-blurbs, and eventually groundings (verbatim party platform quotations). This would let D share the `<UnifiedResultsPage>` component while keeping its conversational input phase.

The key difference from Option 3 as described above: the AI would not just emit raw scores, but a richer structure: `{ scores, partyBlurbs, profile, groundings: [{ partyId, quote, sourceUrl }] }`. The groundings field is the differentiating feature of the final product (see `REQUIREMENTS.md`).

---

---

## Round 3 — Convergence Design (2026-06-19)

### Context

Rounds 1 and 2 (see `docs/user-testing/`) established enough signal to converge. Key findings:

- Both users want AI in the **results** layer (already shipped)
- Both users preferred the **priorities** (B) format as an entry point
- **User 1** (50–60): Wants priorities → deep, personal AI follow-up conversation
- **User 2** (teenager): Prefers structured questions; bounced off D's first AI question — likely a mix of format and tone, not just complexity
- Neither user is satisfied by any single prototype as-is
- **Dilemmas (C)** had weakest reception from both; **Quiz (A)** is liked but impersonal

**Decision**: Stop A/B/C/D side-by-side testing. Converge to two paths — **Prototype E** (new) and **Modified D** — with a redesigned landing page. A, B, C are removed from the homepage but their routes remain accessible.

---

### Overall Architecture

```
Landing page
    ├── [tone signal: ענייני / אישי]   ← example question cards
    ├── [depth signal: בקצרה / בהרחבה] ← register-based
    └── [ → בואו נתחיל ]  (E path)
        + small text link → שיחה חופשית (D path)
            ↓
    Priorities screen (same for E and D)
            ↓
    ┌───────────────────┐   ┌───────────────────┐
    │   Prototype E     │   │   Prototype D     │
    │ structured + AI   │   │   AI chat with    │
    │   follow-ups      │   │  priorities ctx   │
    └───────────────────┘   └───────────────────┘
            ↓                       ↓
         UnifiedResultsPage  (shared, unchanged)
```

Both paths collect tone + depth preferences on the landing page and carry them through the experience.

---

### Landing Page — New Design

**Replaces** the current 4-card prototype grid.

#### Tone signal — example question cards

Two mini-cards side by side, each showing a fragment of the actual question format (multi-choice, not open question). User taps the card whose style they prefer:

| Card 1 — ענייני | Card 2 — אישי |
|---|---|
| `"בכלכלה — מה הגישה העדיפה עליך?"` | `"בכלכלה — מה הכי מכביד עליך?"` |
| `[ הגדלת שכר מינימום ]` `[ הורדת מסים ]` | `[ המשכורת לא מספיקה ]` `[ יוקר הדירות ]` |

The card content is drawn from the actual question sets (see below) so users see exactly what they are signing up for. No abstract labels needed.

**What tone controls:**
- Which question set is used in E (ענייני or אישי — two independent sets, see below)
- AI system prompt register in E's follow-ups: formal/policy language vs. warm/personal language
- AI system prompt register in D: analytical and civic-framed vs. conversational and experience-framed

**What tone does NOT change:** The priorities screen (step 1 for both paths) stays identical.

#### Depth signal

Two options, register-based:

`[ בקצרה ]` &nbsp;&nbsp; `[ בהרחבה ]`

**What depth controls:**

| | בקצרה | בהרחבה |
|---|---|---|
| E — follow-ups per topic | 1 | 2 |
| E — topics covered | Only topics marked קריטי / חשוב מאוד | All topics marked חשוב or above |
| D — conversation turns before synthesis | 4–6 | 8–12 |
| AI follow-up complexity | Focused, concrete | Explores nuance; surfaces dimensions that distinguish similar-seeming parties |

#### Flow choice

No equal-weight fork. E is the default (primary CTA button). D is available as a lower-weight option:

```
          ┌────────────────────────┐
          │   ← בואו נתחיל         │   primary CTA → Prototype E
          └────────────────────────┘

     מעדיפ/ה שיחה חופשית עם AI? לחץ כאן   ← small text → Prototype D
```

This treats E as the recommended path while keeping D accessible. Users who want a conversation will actively seek the link; users who are uncertain or neutral default to E.

---

### Prototype E — Full Spec

**Step 1: Priorities** (identical to current B step 1)
- 8 topics, 4 importance buckets (קריטי / חשוב מאוד / חשוב / פחות חשוב)
- Minimum 3 topics at "חשוב" or above to proceed
- No changes to this screen

**Step 2: Per-topic questions** — for each topic in importance order:

1. **Opener question** — selected from ענייני or אישי question set based on landing preference (see question sets below)
2. User taps an answer
3. Brief loading state → AI returns **1 or 2 follow-up questions** (based on depth setting), rendered as structured tappable cards — **not** chat bubbles
4. User answers follow-up(s) → advance to next topic

**Follow-up question format** (AI output must be structured JSON):
```json
{
  "question": "...",
  "options": ["...", "...", "..."]
}
```
The AI generates follow-ups that do two things: (a) go deeper on the user's concern for that topic, and (b) where parties with similar-looking opener answers actually differ in practice, surface that distinguishing dimension. The AI is not limited to what the user tapped — it may open a related angle that matters for party differentiation.

**Step 3: Optional close**
After all topics: `"יש עוד משהו שחשוב לך שנדע?"` — single optional free-text field → submit.

**Step 4: Results**
- Party **scores and ranking**: calculated from opener answers using the same hardcoded scoring matrix as B (weighted by importance bucket). Follow-up answers are context-only for the AI layer, not fed into the score formula.
- **userAnswersSummary**: built from opener + follow-up answers combined, passed to `/api/results`
- AI layer generates profile + party blurbs as in A/B/C today (no change to `/api/results`)
- Renders `<UnifiedResultsPage>` — unchanged

**Accent color**: teal (distinct from A=blue, B=emerald, C=amber, D=purple)

---

### Two Question Sets — ענייני / אישי

Both sets cover the same 8 topics with the same structure: one question + 4 options. Party scores are **independently calibrated per set** — the options describe genuinely different positions that map differently to parties, not just rewordings of the same answers.

**Structural pattern:**

| | אישי | ענייני |
|---|---|---|
| Question frame | "מה הכי [מכביד / מדאיג / לוחץ] עליך?" | "מה הגישה / העמדה / הפתרון שנכון לך?" |
| Option style | Personal experience, first-person concern | Policy position, what the state should do |
| Scores | Calibrated per option | Separately calibrated — options differ |

#### Implementation approach — audit first

The existing `PRIORITY_QUESTIONS` in `prototype-b/page.tsx` is **not uniformly אישי**. A pre-implementation audit of all 8 topics found:

| Topic | Header | Options |
|---|---|---|
| ביטחון | אישי ("מה הכי מדאיג אותך?") | Mixed — some personal, some civic ("מעמד ישראל") |
| כלכלה | אישי ("מה הכי מכביד עליך?") | Mostly אישי; "עצירת הצמיחה" leans ענייני |
| דיור | אישי ("מה הכי לוחץ אצלך?") | Mostly אישי |
| חינוך | Mixed ("מה הכי חשוב לך?") | Mixed — "ערכים", "כישורים" feel civic |
| בריאות | אישי ("מה הכי מדאיג אותך?") | Mostly אישי |
| דת ומדינה | אישי ("מה הכי מפריע לך?") | Civic — "כפייה", "הכרה", "נישואין" are policy positions |
| שפיטה | Mixed ("מה הכי חשוב לך?") | Fully civic — all 4 options are institutional positions |
| שוויון | Mixed ("מה הכי חשוב לך?") | Civic — "חוק ברור", "ייצוג", "אופי יהודי" |

**Implementation steps per topic:**
1. Decide which register is **dominant** for the existing question (header + options together)
2. Assign it to that set (אישי or ענייני); clean up any internally inconsistent options to match
3. Write the **counterpart** for the other set from scratch, with independently calibrated scores
4. Result: two clean, internally consistent sets across all 8 topics

Not all existing questions will end up in the אישי set — some (e.g., שפיטה, שוויון) are more naturally ענייני and should be assigned there, with an אישי counterpart written.

#### Economy topic — worked example

*אישי:*
> "בכלכלה — מה הכי מכביד עליך?"
> - "יוקר המחיה — המשכורת לא מספיקה לסוף החודש" `[2,2,2,1,1,0,2]`
> - "עתיד הדור הצעיר — קשה להסתדר בלי עזרה מההורים" `[1,2,2,1,1,0,1]`
> - "פערים — בעלי הון מתעשרים, השכירים נשארים מאחור" `[2,2,1,0,0,-1,2]`
> - "עצירת הצמיחה — ישראל מפגרת כלכלית מהיכולת שלה" `[-1,0,1,2,2,2,0]`

*ענייני (to be written):*
> "בכלכלה — מה הגישה הנכונה לך?"
> - "הגדלת שכר מינימום ורשתות ביטחון סוציאלי" → scores TBD
> - "הורדת מסים ועידוד שוק תחרותי שיוזיל מחירים" → scores TBD
> - "מיסוי פרוגרסיבי כדי לצמצם פערים" → scores TBD
> - "השקעה בתשתיות וטכנולוגיה לצמיחה כלכלית" → scores TBD

Scores should be calibrated against the same rubric as the personal set (party order from `lib/parties.ts`: hadash, democrats, beyahad, yashar, beitenu, likud, shas).

**Translation fix included:** `prototype-b/page.tsx` line 52 — "המשכורת לא מגיעה לסוף החודש" → "המשכורת לא מספיקה לסוף החודש"

---

### Prototype D (Modified)

**Changes from current D:**

1. **Priorities as step 1** — before the chat UI, the user goes through the same priorities screen as B/E. The current D welcome screen ("שלום! אני עוזר הבחירות...") is removed; the landing page serves that function.

2. **System prompt augmented** with:
   - User's priorities: topic IDs + importance bucket weights, in descending importance order
   - Tone: `"ענייני"` → formal register, policy vocabulary, analytical framing. `"אישי"` → warm, first-person, conversational, experience-based framing.
   - Depth: `"בקצרה"` → reach synthesis in 4–6 turns. `"בהרחבה"` → 8–12 turns before synthesis.

3. **Everything else unchanged** — turn limit, synthesis detection, `/api/results-d` extraction, `UnifiedResultsPage`.

---

### Bug Fixes Included in Round 3

| Bug | Location | Fix |
|---|---|---|
| Skip in Dilemmas records "A" instead of skipping | `prototype-c/page.tsx:169` | `handleSkip()` should advance without recording an answer |
| Skip button visually hard to find | `prototype-c/page.tsx` | Increase visual weight (larger text, distinct color or border) |
| Translation: "לא מגיעה" | `prototype-b/page.tsx:52` | Replace with "לא מספיקה" |

---

### Deferred to Production Build

- **Tradeoff questions** (e.g., "more to public health but higher taxes vs. more to security but less health"): valuable design direction, but requires (a) well-researched hardcoded question sets, and (b) validation that parties are actually distinguishable on these dimensions. Not in round 3 scope.
- **AI-generated scores for follow-up answers**: follow-up Q&A currently feeds only the AI explanation layer, not the deterministic score. In production, scoring follow-ups properly requires either hardcoded option scores (brittle) or a validated AI-scoring layer (complex). Defer.
- **Grounding against real party platforms**: all current party position scores are rough estimates. Production requires domain expert review + citations.
- **Taste calibration refinement**: if round 3 shows the ענייני/אישי signal is confusing or underused, revisit for production.

---

## Next Steps

1. ✅ Design decisions documented
2. ✅ Scaffold Next.js app in repo root
3. ✅ Build prototype A (statements quiz)
4. ✅ Build prototype B (priority-first, with value/concern question framing)
5. ✅ Build prototype C (dilemmas)
6. ✅ Build prototype D (Gemini AI conversation)
7. ✅ Deploy to Vercel production URL (election-assistant-snowy.vercel.app)
8. ✅ User testing round 1 (2 users, 2026-06-15) — see `docs/user-testing/round-1-feedback.md`
9. ✅ Apply round-1 fixes (error handling, turn limit, topic clarity, hints, priority buckets)
10. ✅ Unified results design — Option 2 implemented for A/B/C (`UnifiedResultsPage` + `/api/results`)
11. ✅ User testing round 2 (2 users, 2026-06-18) — see `docs/user-testing/round-2-feedback.md`
12. 🔲 **Round 3 implementation** (Prototype E + modified D + new landing page — see Round 3 section above)
13. 🔲 User testing round 3 → final UX validation
14. 🔲 Expert review of party position scores (especially ביחד, ישר!) — before any wider distribution
15. 🔲 Phased plan + MVP definition: real data, grounding, infrastructure
