# Election Assistant — Solution Design

**Status**: Prototyping phase (4 UX prototypes under development)
**Last updated**: 2026-06-14

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

**AI**: Google Gemini free tier (`gemini-2.0-flash`). Structured rubric kept in system prompt; party platform data passed as context. AI cannot deviate from provided data.

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
**Google Gemini free tier** via `@google/generative-ai` npm package.
- Primary model: `gemini-2.0-flash` (fast, free tier, generous limits)
- Fallback: `gemini-1.5-flash-8b`
- API key: `GEMINI_API_KEY` env var (`.env.local` locally, Vercel env var in production)
- Pattern: same as `cv-refinery` project

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

## Next Steps

1. ✅ Design decisions documented
2. 🔲 Scaffold Next.js app in repo root
3. 🔲 Build prototype A (simplest — no AI)
4. 🔲 Build prototype B
5. 🔲 Build prototype C
6. 🔲 Build prototype D (requires Gemini integration)
7. 🔲 Deploy to Vercel preview URL
8. 🔲 User testing (voters + advisor)
9. 🔲 Synthesize feedback → decide on final approach
