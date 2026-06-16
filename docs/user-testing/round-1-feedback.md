# User Testing Round 1 — Feedback

**Date**: 2026-06-15  
**Version tested**: e48ca79 (prototypes A/B/C/D at election-assistant-snowy.vercel.app)  
**Participants**: 2 users

---

## User 1

**Profile**: Female, Hebrew speaker, age 50–60

**Overall**: Loved the app.

**Preferred flow**: Priorities flow (Prototype B/D — choose topics by importance)

**Behavior observed**:
- Chose exactly 3 topics — missed the "at least 3" instruction, didn't know she could choose more
- Ideal flow in her mind: a **conversation centered on priorities**, not a fixed-question quiz

**Least liked**: Quiz flow (Prototype A) and Dilemmas flow (Prototype C)

**Key request — deeper questions per topic**: Wants more granular questions within each topic, e.g. for "cost of living":
- "What bothers you most about the cost of living?"
- "What do you think the state should do about it?"
- (Open-ended / sub-questions, not just a preference scale)

**Acknowledged challenge**: Hard to see how open-ended answers about her concerns would map to party positions. Matching mechanism unclear to her.

**Priority ranking UX**: The current strict ordering (1st, 2nd, 3rd…) felt forced. Her preference: **buckets by importance level** — e.g., "קריטי", "חשוב מאוד", "חשוב", "פחות חשוב" — where the user places each topic in the right bucket. Her mental model was drag-and-drop to columns, though a simpler click-to-assign UX might work better. Constraint: at least 3 topics must land in "חשוב" or above. Note: an earlier prototype version used sliders for a similar purpose.

---

## User 2

**Profile**: Female, Hebrew speaker, age 16–18

**Overall**: Loved the app.

**Preferred flow**: Quiz flow (Prototype A) — but also liked the other options

**Key insight — reverse-engineered questions**: Suggested that at least some questions be derived from what's actually written in party platforms, so the quiz actively distinguishes between parties. Acknowledged that user-centric question flows are still useful and should be kept alongside.

**Terminology gap**: Had difficulty understanding some political/economic terms (e.g. "market economy", "welfare state"). Suggested adding **hints** — short explanations or links — for technical terms.

**Critical UX issue — Gemini quota exhausted**:
- Spent significant time in the AI chat, deeply engaged
- Hit the Gemini free-tier quota limit (429 RESOURCE_EXHAUSTED) just before receiving results
- The raw JSON API error was displayed verbatim — very technical, frightening, and frustrating at the worst possible moment
- See screenshot: `/tmp/err.jpg`

---

## Synthesis

### What's working
- Both users loved the experience — strong signal the core concept resonates
- Preferences split by age/profile (priorities flow vs. quiz), suggesting both should exist or a smart default
- The AI chat is highly engaging — enough to drive young users to hit rate limits

### Key issues to address (prioritized)

| Priority | Issue | Notes |
|----------|-------|-------|
| 🔴 Critical | Raw Gemini API error shown to user | Fix error handling + user-friendly message; consider budget reservation for final answer step |
| 🟠 High | Topic selection: "at least 3" not understood | Make it clearer that more choices = better results |
| 🟠 High | Terms need hints/explanations | Tooltips or "?" links for economic/political jargon |
| 🟠 High | Priority ranking: strict order → importance buckets | Replace ranked list with "קריטי / חשוב מאוד / חשוב / פחות חשוב" buckets; click-to-assign simpler than drag-and-drop; require ≥3 topics at "חשוב" or above |
| 🟡 Medium | Deeper per-topic questions | Open-ended sub-questions within each topic; harder to match to platforms |
| 🟡 Medium | Questions derived from platform distinctions | Some questions should be reverse-engineered from party platforms to maximize discrimination power |
| 🟢 Low | Conversational flow for User 1 type | Could be addressed by a more dynamic priorities-first flow |

### Design implications
- **Don't pick one prototype** — the two users represent distinct audience segments that prefer different entry points
- **Quota/cost management** is a product-critical issue, not just a technical one: need a strategy before wider distribution
- **Question design** will need two complementary tracks: user-centric (what bothers you) + platform-derived (distinguishing questions)
- **Terminology hints** are a quick win with high accessibility impact
