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
- Model: `gemini-3.5-flash` (current; user explicitly required this model)
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

**Note on model**: `gemini-3.5-flash` is the correct model ID (designed for agentic use, 1M token context). Despite appearing non-existent in some LLM training data, it is current and valid per the [official docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash).

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

## Next Steps

1. ✅ Design decisions documented
2. ✅ Scaffold Next.js app in repo root
3. ✅ Build prototype A (statements quiz)
4. ✅ Build prototype B (priority-first, with value/concern question framing)
5. ✅ Build prototype C (dilemmas)
6. ✅ Build prototype D (Gemini AI conversation)
7. ✅ Deploy to Vercel production URL (election-assistant-snowy.vercel.app)
8. ✅ User testing round 1 (2 users, 2026-06-15) — see `docs/user-testing/round-1-feedback.md`
9. 🔲 Apply round-1 fixes (error handling, turn limit, topic clarity, hints, priority buckets) → redeploy for round 2
10. 🔲 User testing round 2 → synthesize feedback → decide on final approach
11. 🔲 Expert review of party position scores (especially ביחד, ישר!)
12. 🔲 Phased plan + MVP definition once prototype winner is known
