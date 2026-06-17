# Changelog

## 2026-06-16–17 — User Testing Round 1: Feedback Captured + UX Fixes + Analytics

### What We Did

After testing with 2 users on build `e48ca79`, captured structured feedback and shipped all critical fixes before round 2. Also added analytics and LLM observability.

### User Testing Round 1 Findings

Feedback captured in `docs/user-testing/round-1-feedback.md`. Key issues:
- **Prototype D**: Raw Gemini API error JSON shown to users when quota exhausted (worst possible UX)
- **Prototype D**: Free tier quota (`gemini-3.5-flash` RPD=20) exhausted by 2 users in a single day
- **Prototype B**: "Select at least 3 topics" read as "exactly 3" — users stopped early
- **Prototypes A, C**: Teen user (age 16–18) didn't understand terms like "כלכלת שוק", "מדינת רווחה"
- **Prototype B**: Strict rank-ordering of priorities was cognitively demanding and imprecise

### UX Fixes (`7efabc0`)

**Prototype D — Friendly error messages**: `route.ts` now returns structured error codes (`QUOTA_EXCEEDED`, `AUTH_ERROR`, `SERVER_ERROR`, `NETWORK_ERROR`). Frontend maps codes to friendly Hebrew strings. Previous behavior: raw Gemini SDK error JSON exposed to users.

**Prototype D — Turn limit + auto-synthesis**: `MAX_TURNS = 8`. On turn 8, `isFinalTurn: true` is passed to the API, which appends `SYNTHESIS_INSTRUCTION` to the system prompt, forcing party ranking output. User always reaches results; usage is capped at ≤9 API calls/session.

**Prototype B — Topic selection clarity**: Subtitle updated to explain "ככל שתבחרי יותר נושאים, כך התוצאה תהיה מדויקת יותר". Live counter below grid: "בחרת N נושאים — ניתן לבחור עוד". Button disabled with reason text until ≥3 selected.

**Prototype B — Priority buckets**: Replaced strict rank-ordering with importance-level buckets. Each topic gets a row of 4 buttons: קריטי (4) / חשוב מאוד (3) / חשוב (2) / פחות חשוב (1). Matching weights are the bucket values. Gate: ≥3 topics at bucket ≥2.

**Prototypes A, C — Term hints** (`components/TermHint.tsx`): Expandable `?` button inline next to unfamiliar terms. Tap reveals one-line Hebrew definition; tap again to close. Added to: שתי מדינות, נישואין אזרחיים, עצמאות משפט (Prototype A); שוק חופשי, ממשל בינלאומי (Prototype C).

**Footer**: `text-gray-300` → `text-gray-500` for improved readability.

### Analytics (`422b079`)

- **Vercel Analytics**: `@vercel/analytics/next` — `<Analytics />` in `app/layout.tsx`
- **Hotjar**: Site ID `6507347` (same account as cv-refinery). Added via `next/script` with `strategy="afterInteractive"`
- Initially implemented Helicone for LLM tracking; discovered new signups closed at us.helicone.ai → removed

### Env File Cleanup (`2104444`)

- Deleted `.env` — contained cv-refinery credentials (wrong project, should not exist)
- `.env.example` — documentation file, committed, describes all env vars
- `.env.local` — real keys, gitignored

### Gemini Model Switch (`8727c6d`)

- **Problem**: `gemini-3.5-flash` has RPD=20 on free tier — exhausted by 2 users testing in one afternoon (confirmed via Google AI Studio dashboard: 89 calls June 15)
- **Fix**: Switched to `gemini-3.1-flash-lite` — RPD=500, RPM=10 (25× more headroom)
- **Tradeoff**: Slightly older model; quality difference not significant for structured political Q&A
- **Revisit**: If RPD=500 is exhausted by wider distribution, evaluate paid tier

### Langfuse LLM Observability (`f5d901f`, `3ec0623`)

- Package: `langfuse` npm (direct SDK, not OTel — simpler for Next.js serverless API routes)
- Tracks each conversation turn: sessionId (via `crypto.randomUUID()` in client), turn number, isFinalTurn flag, model, input messages, output text
- Pattern: `langfuse.trace() → trace.generation() → generation.update() → generation.end() → langfuse.flushAsync()` — `flushAsync` is critical for serverless (process exits before background flush completes)
- Keys stored in `.env.local` and Vercel environment variables; gracefully bypassed if keys absent
- Langfuse agent skill installed via `npx skills add` from github.com/langfuse/skills

### Commits

```
3ec0623 feat: add Langfuse agent skill + Langfuse API keys configured
f5d901f feat: replace Helicone with Langfuse for LLM conversation tracking
8727c6d fix: switch AI model from gemini-3.5-flash to gemini-3.1-flash-lite
2104444 chore: clean up env files
422b079 feat: analytics — Vercel Analytics, Hotjar, Helicone LLM tracking
7efabc0 fix: round-1 UX fixes — error handling, turn limit, priority buckets, term hints
```

---

## 2026-06-14–16 — UX Prototypes Built, Deployed, and Sent for User Testing

### What We Built

Four interactive Hebrew RTL prototypes deployed to https://election-assistant-snowy.vercel.app:

| | Prototype | Model |
|--|--|--|
| א | הצהרות | 6 agree/disagree statements, 5-point scale |
| ב | עדיפויות | Click-to-rank topics → value/concern question per topic |
| ג | דילמות | 6 concrete policy trade-off scenarios |
| ד | שיחה | AI conversation (Gemini gemini-3.5-flash) |

All prototypes use real 2026 Israeli parties, show a methodology disclaimer, and render a build ID badge for feedback traceability.

### Real 2026 Party List (corrected by advisor)

Source of truth: `lib/parties.ts`. Ordered left→right spectrum:

| ID | Name | Note |
|--|--|--|
| hadash | חד"ש-תע"ל | |
| democrats | הדמוקרטים | Formerly העבודה |
| beyahad | ביחד | Formerly יש עתיד + Bennett; subtitle בנט/לפיד |
| yashar | ישר! | New party; subtitle איזנקוט; links to missions page, not formal מצע |
| beitenu | ישראל ביתנו | |
| likud | ליכוד | |
| shas | ש"ס | |

Removed: המחנה הממלכתי (dissolved).

**Party scoring**: manual estimates based on known public positions — **not verified against current party platforms**. Results pages show methodology disclaimer. New parties (ביחד, ישר!) especially need expert review.

### מצע (Platform) Transparency

Every party result card shows:
- "אתר המפלגה ↗" link (or "אתר לא ידוע" if missing)
- `platformUrl` present → clickable link with `platformLabel` (or "מצע רשמי")
- `platformUrl` absent → "אין מצע מפורסם" in red

Currently, only ישר! has a link (`yasharwitheisenkot.com/topic/missions/`) labeled "משימות (לא מצע)" — honest about it not being a formal platform.

### Gemini Integration (Prototype D)

- Package: `@google/genai` v2.8.0 (replaced deprecated `@google/generative-ai`)
- Model: `gemini-3.5-flash` (current Google model; explicitly required by user)
- `maxOutputTokens: 2000` — was 600, was truncating responses mid-sentence
- System prompt includes structured rubric with all 7 parties; requires per-party explanation tied to what user said in chat

### Build ID / Version Badge

- `next.config.ts` resolves git SHA at build time (`VERCEL_GIT_COMMIT_SHA?.slice(0,7)` || `git rev-parse --short HEAD`)
- Injected as `BUILD_ID` env var; rendered in `app/layout.tsx` as fixed badge bottom-right
- `text-gray-500` for visibility without distraction
- Required because collecting user feedback via screenshots — needed version traceability

### Key UX Decisions (Prototype B)

Questions are value/concern framing, not policy prescriptions: "מה הכי מדאיג אותך ב[נושא]?" rather than "what policy do you prefer?". Min 3 topics, no max cap. Skip and back buttons both work correctly. Back from first question → ranking step; skip on last question → results.

### Files Created/Changed

- `app/layout.tsx` — RTL layout, Rubik font, build ID badge
- `app/page.tsx` — landing page; "שאלון קלאסי" (not "Quiz"); 4 prototype cards
- `app/prototype-a/page.tsx` — statements quiz; PARTY_POSITIONS 7×6
- `app/prototype-b/page.tsx` — priority-first; click-to-rank + per-topic questions
- `app/prototype-c/page.tsx` — dilemmas; PARTY_LEANINGS 6×7
- `app/prototype-d/page.tsx` — AI conversation; static intro + real Gemini chat
- `app/api/chat/route.ts` — server-side Gemini API route
- `lib/parties.ts` — shared party metadata (single source of truth)
- `components/PartyResultCard.tsx` — shared result card with מצע logic
- `next.config.ts` — BUILD_ID injection
- `vercel.json` — `{"framework":"nextjs"}` (Vercel couldn't auto-detect framework)
- `.gitignore` — `.env.local` excluded; API keys never committed

### Technical Fixes Applied

- Migrated Gemini SDK (`@google/generative-ai` → `@google/genai` v2.8.0)
- Deployed Next.js 16 (security fix; 15.3.3 was blocked)
- "פריה" (accidental Hebrew for "her fruit") → "בדידות דיפלומטית"
- "Quiz" → "שאלון"; "פלטפורמה" → "מצע" throughout
- Version badge: fixed 3 times (invisible → wrong env var → build-time injection)
- Added `vercel.json` when Vercel couldn't auto-detect Next.js

---

## 2026-06-14 — Solution Design + Prototyping Approach

### Decisions Made

**Prototyping strategy**: Build 4 clickable UX prototypes before committing to a technical approach. Show to real users (voters) and the advisor for feedback. Prototypes vary on *how questions are asked* — the highest-leverage UX decision.

**4 prototypes defined** (see `docs/SOLUTION-DESIGN.md` for full rationale):
- **A — הצהרות (Statements)**: Classic agree/disagree binary quiz, 25–30 questions, linear flow. Wahl-O-Mat model.
- **B — עדיפויות (Priority-First)**: User weights 8–10 topic areas first, then answers deeper questions on their top priorities only.
- **C — דילמות (Dilemmas)**: Concrete trade-off scenarios instead of abstract ideological statements.
- **D — שיחה (Conversation)**: AI-guided structured dialogue; structured rubric underneath, conversational surface on top.

**Tech stack decided**:
- Framework: Next.js (React), scaffolded in this repo
- Hosting: Vercel (already connected to GitHub; auto-deploys on push)
- AI (prototype D): Google Gemini free tier (`gemini-2.0-flash` via `@google/generative-ai`)
- Language: Hebrew from the start; RTL layout

**Rejected approaches** (with rationale in `docs/SOLUTION-DESIGN.md`):
- Lovable: Free tier too limited for 4 prototypes; vendor lock-in; poor RTL support
- Claude.ai "skill"/Project: Requires Claude accounts (barrier for general public); no reproducible results; opaque to users

**Gemini API key**: stored in `.env.local` (gitignored) for local dev; Vercel environment variable for deployment. Pattern follows cv-refinery project.

### Infrastructure
- `.gitignore` updated for Node.js / Next.js artifacts
- `docs/SOLUTION-DESIGN.md` created

---

## 2026-03-28 — Project Kickoff + Competitive Research

### Project Setup
- Created `README.md` (public-facing), `README.txt` (superseded, to delete), `REQUIREMENTS.md`, `TODO.md`, `LICENSE` (MIT), `.gitignore`
- Initialized git repo with `main` branch; created private GitHub repo at https://github.com/EfriNS/election-assistant
- `Screenshots/` excluded from repo (internal reference material)
- `CLAUDE.md` and `docs/` excluded from initial commit (internal Claude Code scaffolding)

### Requirements Captured (`REQUIREMENTS.md`)
Key decisions documented:
- **Goal**: Free public tool matching Israeli voters to parties by values; Hebrew-first, multilingual
- **Audience**: General public, wide distribution
- **Data**: Official party platforms only; verbatim quotations with source URL + date; no social media
- **Parties**: All parties; explicit "no platform available" for those without one
- **Curation**: Semi-automatic ingestion + human (advisor) review
- **Cost cap**: ~$50/month
- **Interaction model**: Hybrid — structured quiz engine + AI explanation layer (not freeform chatbot)
- **Open questions** explicitly preserved (technical approach, question design, pipeline design, cost model)

### Competitive Research (`docs/COMPETITIVE-RESEARCH.md`)
**Israeli landscape:**
- No active VAA exists for Israel; the only one ever built (JPost/IDI, 2009) is dead
- Proven demand: 600K users in a single election with no marketing infrastructure
- Other Israeli tools (HaMadad, Kaplan map, Elector) are not party-matching tools

**International tools analyzed:**
- Wahl-O-Mat (Germany): binary quiz, 38q, parties self-report, ~26.5M uses/election; most trusted globally
- Vote Compass (Vox Pop Labs): 6-point slider, 30–40q, 2D compass visualization, media partnerships
- ISideWith (US/global): 70–100q with nuance follow-ups, editorial party data, best mobile UX
- Kieskompas (Netherlands): 30q, expert-calibrated 2D placement, strongest academic methodology
- Smartvote (Switzerland): 75q, individual candidate matching, self-reported data

**Academic research findings:**
- VAAs increase turnout 8–22%; shift vote preferences 1–10%
- Optimal question count: 30–35 (completion drops sharply above 40–50)
- Importance weighting improves match quality but only 20–30% use it when optional → make it mandatory
- Framing bias, populist inflation, and algorithmic opacity are the top design pitfalls
- Users specifically distrust chatbot-style VAAs on political topics

**Gap analysis — our differentiators:**
- Verbatim quotations from official platforms: 0 out of all major tools do this
- Coalition modeling (which coalition scenario do I enable?): 0 out of all major tools do this; globally unique; highly relevant to Israel
- Hebrew-first multilingual (Hebrew + Arabic + Russian + English)
- Active Israeli VAA: first in 12+ years
- Israel needs 3–4 political axes (security, religion/state, socioeconomic, Arab-Jewish) — standard 2D model is inadequate

### Interaction Model Defined (`REQUIREMENTS.md`)
Documented the hybrid model rationale:
- Structured quiz = engine (deterministic, auditable, consistent)
- AI = explanation + adaptation layer (follow-up depth, result narrative, quotation surfacing, tone)
- Freeform chatbot as primary interface explicitly ruled out (inconsistency, opacity, hallucination risk, trust research)
