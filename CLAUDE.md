# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## *LEARNING SYSTEM - READ THIS FIRST*

**Purpose**: The `docs/learnings/` system exists primarily for **Claude Code (me) to consume**.

**Structure**:
- `docs/learnings/universal/` - Transferable principles (copied from template)
- `docs/learnings/project/` - Project-specific patterns (created during development)
- `docs/learnings/INDEX.md` - Quick reference hub (read at session start)

**When Claude reads learnings**:
- **Session start** (`/start`): Read INDEX.md + relevant topic file for TODO item
- **Context compacting**: Use `/relearn` command to restore critical context
- **Session end** (`/wrapup`): Update learnings with new insights

**Key principle**: Learnings change Claude's behavior. If a principle doesn't affect how Claude works, it's documentation (belongs in docs/ or comments), not a learning.

---

## *CONTEXT COMPACT PROTOCOL*

**When you notice context has compacted (conversation feels "fresh" or you lack project context):**

1. **IMMEDIATELY ask user to run**: `/relearn`
2. **Don't proceed** with work until context is restored
3. **Don't guess** at project patterns or guidelines

**Trigger signals indicating context loss:**
- ⚠️ User mentions something you should know but don't remember
- ⚠️ You're about to violate a principle from CLAUDE.md (but don't know it)
- ⚠️ You don't recognize project-specific patterns or architecture
- ⚠️ You suggest creating files that likely already exist
- ⚠️ You ask questions that are answered in REQUIREMENTS.md
- ⚠️ You don't follow the branching workflow (feature branches)
- ⚠️ Token usage shows you're near the start of conversation but mid-task

**What NOT to do:**
- ❌ Don't continue work without context (leads to violations of guidelines)
- ❌ Don't manually read files one-by-one (use `/relearn` for systematic refresh)
- ❌ Don't assume you remember - explicitly verify with `/relearn`

**Response template when context loss detected:**
```
⚠️ I notice my context may have compacted. Before continuing, please run:

  /relearn

This will restore my knowledge of:
- Project guidelines and workflow (CLAUDE.md)
- Key learnings and principles (INDEX.md)
- Product requirements (REQUIREMENTS.md)
- Current work context (from conversation/git)

I'll wait for the context refresh before proceeding.
```

---

## *IMPORTANT ARCHITECTURAL GUIDELINES*
- Always prioritize user value and simplicity
- Always ensure that solutions maintain security
- **AVOID WORKAROUNDS AT ALL COSTS** - When encountering issues, find and fix the root cause instead of adding workarounds, fallbacks, or complex parsing logic that masks the real problem
- **TRUST AI-EXTRACTED DATA** - When the AI has already validated and extracted data, don't add unnecessary formatting or parsing logic. Just display it with proper treatment
- **DON'T OVER-ENGINEER** - Avoid creating unnecessary utility functions, complex formatters, or modules when simple logic suffices. If it's already structured data, use it as-is
- **ROOT CAUSE INVESTIGATION OVER SYMPTOM FIXING** - When something appears wrong or requires complex processing to be usable, trace the issue back through the entire pipeline to find where it gets corrupted
- **NEVER DECLARE SUCCESS WITHOUT VERIFICATION** - Do not mark debugging sessions or fixes as "complete" or "working perfectly" until you have confirmed the solution actually resolves the issue. Build success ≠ functional success. Always test the actual user flow that was broken before claiming victory
- Ask me before adding workarounds and defaults (especially when those might hide issues in the flow)

### **MANDATORY: Root Cause Investigation Checklist**

Before fixing ANY test failure, error, or unexpected behavior, complete this checklist:

1. **Trace the value back to source**:
   - WHERE is this value created? (file:line)
   - WHAT formula/logic produces it?
   - CAN it mathematically produce the observed value?

2. **Question the symptom**:
   - Is this value SUPPOSED to be possible?
   - If "no" → Fix the source, not the test
   - If "yes but rare" → Still fix the source with defensive logic

3. **Before modifying tests** (tolerance, type changes, assertions):
   - Ask: "Am I hiding a bug in application code?"
   - Propose the test change to user FIRST
   - Explain WHY the value can occur and WHERE it's created

4. **Red flags that indicate workaround thinking**:
   - "Just increase the tolerance to..."
   - "Add a try/catch around..."
   - "Parse the output with regex..."
   - "Add a fallback for when..."
   - **STOP**: Investigate root cause instead

**Example (real incident, 2026-07-02)**:
- ❌ Bad: "`JSON.parse` occasionally fails on Gemini's output — catch the error and retry, or regex-extract the JSON blob"
- ✅ Good: "Traced back → Gemini emits unescaped Hebrew gershayim (`צה"ל`) inside JSON string values when `responseMimeType: 'application/json'` is set without a schema → switched to `responseJsonSchema` (constrained decoding), which makes invalid escaping structurally impossible instead of parsing around it"

---

### 🛑 STOP - Coding Implementation Triggers

**BEFORE writing implementation code, read: [`docs/learnings/universal/CODING-PRINCIPLES.md`](docs/learnings/universal/CODING-PRINCIPLES.md)**

**Critical checkpoints during implementation:**

**🛑 STOP - Before Adding Error Handling**
- If you're about to write `try/catch` or error handling → Read CODING-PRINCIPLES.md #1-2
- Ask: WHERE does this error originate? Can I fix the root cause?
- Use: Root Cause Investigation Checklist (above)

**🛑 STOP - Before Adding Data Parsing/Validation**
- If you're about to add parsing, regex, sanitization, or data validation → Read CODING-PRINCIPLES.md #2-3
- Ask: Why isn't this data already structured? Can I fix upstream (AI prompt, API, data source)?
- Remember: Trust validated data - don't re-validate internal data

**🛑 STOP - Before Extracting Functions/Creating Utilities**
- If you're about to extract a function or create a utility → Read CODING-PRINCIPLES.md #4
- Ask: Used in 3+ places? Adds actual user value? Simpler than inline?
- Use: Over-Engineering Check (in CODING-PRINCIPLES.md)

**🛑 STOP - Before Adding Fallbacks/Defaults**
- If you're about to add fallback logic, default values, or "just in case" handling → Read CODING-PRINCIPLES.md #1
- Ask: "Are we adding a workaround again?" What's the root cause?
- Remember: Avoid workarounds at all costs

**🛑 STOP - After Completing Implementation (BEFORE moving to next phase)**
- **MANDATORY**: Add tests for all code changes
- Use: Test Coverage Checklist (CODING-PRINCIPLES.md)
- Verify: Run tests and check coverage didn't drop
- Red flag: "I'll add tests later" → Add them NOW

---

- Make sure that changes are broken to small self-contained phases. Propose to commit and clear the context at the end of each phase
- Ask me clarifying questions if something (e.g., the requirements, role or directions) are unclear

## *AGENT USAGE GUIDELINES*
- For requests that are clearly "plan", "design", or "architect" a non-trivial feature — use plan mode (`EnterPlanMode`) or the `Plan` agent before writing implementation code, rather than jumping straight to code.

## *TESTING & DEPLOYMENT WORKFLOW*

### When to Run Tests (Realistic Balance)

**ALWAYS Test Before:**
- ✅ **Deployment** (Vercel preview/production) - NON-NEGOTIABLE
- ✅ **Pushing to main/shared branches** - Prevents sharing broken code
- ✅ **Completing a bug fix** - Add regression test, verify all tests pass

**Sometimes Test:**
- ⚠️ During iteration (5-10 commits while building) - use judgment
- ⚠️ For trivial changes (copy tweaks, comments) - low risk

**Testing Commands:**
```bash
# Run all tests
npm test

# Run a specific test file
npx vitest run tests/groundingProvenance.test.ts

# Run with coverage
npm run test:coverage

# Watch mode during development
npm run test:watch
```

### Mandatory Pre-Push Checklist

**⚠️ Run these three checks before pushing (`/checkpoint` and `/wrapup` should run them for you — verify they actually did if in doubt):**

```bash
# 1. Run all tests (NO EXCEPTIONS)
npx vitest run

# 2. Type check (NO EXCEPTIONS)
npx tsc --noEmit

# 3. Lint (NO EXCEPTIONS)
npx eslint .
```

**Why this is enforced:**
- `/checkpoint` - Ensures WIP branches are always in working state
- `/wrapup` - HARD REQUIREMENT before merging to main
- No manual checklist needed - automation prevents mistakes
- If checks fail: Fix before proceeding (no exceptions)

**Manual Push** (if not using `/checkpoint`/`/wrapup`):
If you need to push manually (rare), run all 3 commands above first.

---

### Pre-Deployment Checklist (For Major Changes)

**Before deploying significant features:**

1. **Identify what changed** this session (routes, components, data files)

2. **Run comprehensive tests**:
   - Run full test suite (not just changed modules)
   - Test integration points
   - Verify coverage hasn't dropped

3. **Verify tests + typecheck + lint all pass** - Use checklist above

4. **Regression test check** - If you fixed a bug:
   - Ask: "Could this bug happen again?"
   - If YES: Add regression test
   - Document what it prevents

5. **Report readiness**:
   - "✅ Tests passing: [all N tests]"
   - "✅ tsc + eslint clean"
   - "Ready to deploy"

### When to Add Regression Tests

**High Value (Always Propose)**:
- Bug that caused an API route to fail in production
- Bug that could silently corrupt grounding or scoring data
- Bug that only appears with specific queries/inputs (edge cases)
- Bug that took >30 minutes to debug

**Medium Value (Use Judgment)**:
- Bug in a well-tested module (gap in coverage)
- Bug that could affect multiple API routes (e.g. a shared schema-building helper)

**Low Value (Skip)**:
- One-off environment issue
- Typo in logging messages
- Documentation-only bug

**Test Effort Rule**: If test takes <15 minutes to write and prevents hours of future debugging → ADD IT

### Learning Resources

**Before any task**, consult:
- `docs/learnings/INDEX.md` - Quick reference hub (Top 10 principles, cross-cutting themes)
- `docs/learnings/universal/` - Universal principles from template
- `docs/learnings/project/` - Project-specific patterns (created as we work)

**Relevant topic files**:
- `TESTING.md` - Testing principles, QA approach, infrastructure
- `DEBUGGING.md` - Verification discipline, systematic investigation
- `ARCHITECTURE.md` - Design decisions, simplicity, root cause fixes
- `CI-CD.md` - Local verification, deployment, workflow debugging
- `PROCESS.md` - User collaboration, session management, documentation
- `AI-PROMPTS.md` - Token budgets, prompt design, validation

**Key sections to reference in TESTING.md**:
- "When to Apply These Principles" - Workflow guidance
- "Anti-Patterns to Avoid" - What NOT to do
- "Reference Examples" - Real-world patterns

---

## *PROJECT-SPECIFIC CONFIGURATION*

### Development Commands

Standard Next.js/TypeScript project — no virtual environment or system-level setup beyond `npm install`.

```bash
# Setup
npm install                          # Install dependencies

# Development
npm run dev                          # Start dev server (localhost:3000)
npm run build                        # Production build
npm start                            # Run production build locally

# Testing
npm test                             # Run all tests (vitest)
npm run test:watch                   # Watch mode
npm run test:coverage                # Coverage report
npx vitest run tests/<file>.test.ts  # Single test file

# Linting & type checking
npm run lint                         # ESLint (eslint-config-next)
npx tsc --noEmit                     # Type check only, no build output

# Content/data tooling (Hebrew grounding data + questions)
npm run export:questions             # Generates docs/advisor-review/questions-review.{md,html}
npm run export:grounding-review      # Generates docs/advisor-review/grounding-review.html from data/groundings/*.json
npm run score:auto                   # AI-assisted scoring proposal (needs .env.local + ANTHROPIC_API_KEY)
npm run score:apply                  # Preview applying proposed scores to lib/questions.ts
npm run score:apply:write            # Apply proposed scores for real

# Deployment
# Vercel auto-deploys on push (preview on branches, production on main).
# Never run `vercel deploy` manually — GitHub push is the trigger.
```

### Project Architecture

**Tech Stack**:
- **Framework**: Next.js (App Router), TypeScript (strict mode), React 19
- **Styling**: Tailwind CSS
- **AI**: Gemini API (`@google/genai`) — structured JSON output (`responseMimeType: "application/json"` + `responseJsonSchema`) for follow-up questions, topic scoring, and results synthesis
- **Observability**: Langfuse (a trace + generation per Gemini call; routes degrade gracefully if unset)
- **Rate limiting**: Upstash Redis + `@upstash/ratelimit` (see `middleware.ts`)
- **Analytics**: Mixpanel (`mixpanel-browser`), Vercel Analytics
- **PDF export**: `puppeteer-core` + `@sparticuz/chromium` (serverless-compatible Chromium)
- **Testing**: Vitest
- **Deployment**: Vercel (preview + production, auto-deploy on push)

**Directory Structure**:
```
election-assistant/
├── app/                          # Next.js App Router
│   ├── quiz/                    # Main quiz flow (opener + AI follow-up questions)
│   ├── about/                   # Static /about page (methodology, neutrality statement)
│   ├── rate-limited/             # Shown when the Upstash rate limit is hit
│   └── api/                      # API routes (Gemini-backed unless noted)
│       ├── follow-up/            # Generates the next follow-up question for a topic
│       ├── score-topics/         # Scores user answers against party grounding data
│       ├── results/              # Generates the AI results blurb + assembles groundings
│       ├── export-pdf/           # Puppeteer-rendered PDF of results
│       ├── feedback/             # Feedback widget submissions → Slack
│       ├── quota-check/          # Cron-triggered Gemini quota monitor → Slack alerts
│       └── chat/
├── components/                   # React components (PartyResultCard, UnifiedResultsPage, etc.)
├── lib/                          # Core domain logic — see below
├── data/groundings/               # Per-party grounding data (one JSON file per party)
├── docs/
│   ├── sources/                    # Archived source material per party (dated markdown)
│   ├── advisor-review/             # Generated review artifacts — regenerate via npm scripts, don't hand-edit
│   ├── learnings/                  # Claude Code learning system (see top of this file)
│   └── user-testing/               # User testing round summaries
├── scripts/                       # One-off/maintenance scripts (tsx), not part of the app build
├── tests/                         # Vitest tests (flat, not mirrored to app/lib structure)
├── middleware.ts                  # Upstash rate limiting
└── vitest.config.ts / vercel.json / tailwind.config.ts
```

**Key domain files in `lib/`**:
- `groundings.ts` — grounding data types + accessors; the `Provenance` × `Concreteness` quality model and `getBestEvidenceForTopic()` (the official-material-first selection rule used everywhere quotes are chosen)
- `questions.ts` — opener questions per topic + `TOPIC_KEY_DIMENSIONS` (canonical follow-up dimension taxonomy)
- `topics.ts` — canonical topic list (`security`, `economy`, `housing`, `education`, `health`, `religion`, `justice`, `equality`, `ecology`)
- `parties.ts` — party metadata; must stay in sync with `data/groundings/*.json` (see `docs/learnings/project/VAA-DESIGN.md` item 63)
- `scoring.ts` — topic scoring math (power-curve weighting)
- `grounding-types.ts` — API-facing "lite" types returned by `/api/results`

**Key Architectural Patterns**:
- **Quiz flow**: fixed opener question per topic (manually written) → AI-generated follow-up question (Gemini, structured output) → both feed topic scoring
- **Scoring pipeline**: opener answer (pre-calibrated) + follow-up answer (AI-scored against grounding quotes) → per-topic score → power-curve-weighted overall ranking (`lib/scoring.ts`)
- **Grounding quality model**: every quote has `provenance` (official-current/official-outdated/joint-list/third-party) × `concreteness` (quantified/named-mechanism/specific-stance/generic); `getBestEvidenceForTopic()` is the single selection rule for scoring, quoting, and follow-up dimension selection — official material only when it exists, third-party/joint-list strictly as a fallback
- **Gemini structured output is mandatory, not optional**: all 3 AI routes (`follow-up`, `score-topics`, `results`) use `responseJsonSchema`/`responseSchema` — prompt instructions alone do not reliably produce valid JSON for Hebrew text with acronyms (two production incidents, see CHANGELOG 2026-07-02)

**Data Flow**:
```
User answers quiz (app/quiz/page.tsx)
    ↓
/api/follow-up (Gemini, structured output) — generates next follow-up question per topic
    ↓
/api/score-topics (Gemini, structured output) — scores answers vs. party grounding quotes
    ↓
lib/scoring.ts — combines opener + follow-up scores, power-curve weighting
    ↓
/api/results (Gemini, structured output) — generates results blurb + assembles grounding quotes
    ↓
UnifiedResultsPage / PartyResultCard (+ /api/export-pdf for PDF export)
```

**Environment Configuration**:
```bash
# Required
GEMINI_API_KEY=...                       # Gemini API (all 3 AI routes)

# Observability (optional — routes degrade gracefully if unset)
LANGFUSE_SECRET_KEY=...
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_BASE_URL=...                    # defaults to https://cloud.langfuse.com

# Rate limiting (middleware.ts)
KV_REST_API_URL=...                      # Upstash Redis
KV_REST_API_TOKEN=...

# Alerting
QUOTA_SLACK_WEBHOOK_URL=...               # /api/quota-check alerts
FEEDBACK_SLACK_WEBHOOK_URL=...            # /api/feedback submissions
CRON_SECRET=...                           # authenticates Vercel cron → /api/quota-check

# Analytics
NEXT_PUBLIC_MIXPANEL_TOKEN=...

# Local-only
CHROME_PATH=...                           # local PDF-export dev only; @sparticuz/chromium used on Vercel
ANTHROPIC_API_KEY=...                     # only needed for scripts/auto-score.ts (npm run score:auto)
```

### Code Style Guidelines

**TypeScript/Next.js Style**:
- **Strict mode** (`tsconfig.json`) — no implicit `any`; run `npx tsc --noEmit` before considering a change done
- **ESLint**: `eslint-config-next` flat config (`eslint.config.mjs`) — run `npm run lint`
- **No separate formatter configured** — match the existing file's formatting rather than reformatting wholesale
- **Path alias**: `@/*` maps to the repo root (e.g. `@/lib/groundings`)

**Naming Conventions**:
- `camelCase` for functions and variables
- `PascalCase` for components and types
- `kebab-case.ts` for files in `lib/` (e.g. `grounding-types.ts`); `PascalCase.tsx` for components
- `UPPER_CASE` for module-level constants (e.g. `TOPIC_KEY_DIMENSIONS`)

**Hebrew/RTL content** (this app is Hebrew-first):
- All user-facing strings are Hebrew; set `dir="rtl"` at the appropriate container level, not per-element
- Never interpolate a dynamic value into the middle of a Hebrew sentence unless every possible value produces grammatical Hebrew — see `docs/learnings/project/NEXTJS-REACT-PATTERNS.md`
- Hebrew abbreviations containing a quotation mark (e.g. `רע"מ`) must use the Hebrew gershayim character `״` (U+05F4), not a plain `"`, inside any JSON string value — a recurring source of `JSON.parse` failures, both hand-authored (grounding files) and AI-generated (Gemini routes)

**Comment Style**:
- Prefer clear naming over comments; comment only non-obvious *why*, not *what*

### Testing Guidelines

**Test Framework**: Vitest

**Test File Organization**:
- Flat `tests/` directory (not mirrored to `app/`/`lib/` structure) — one file per concern, e.g. `groundingProvenance.test.ts`, `aspectTaxonomy.test.ts`, `resultsResponseSchema.test.ts`
- Test file naming: `<concern>.test.ts` — name it after what's being verified, not necessarily the source module name
- Use `describe`/`it` with prose descriptions of the scenario and expected outcome

**Example** (real pattern, `tests/aspectTaxonomy.test.ts`):
```ts
import { describe, it, expect } from "vitest";
import { GROUNDINGS } from "@/lib/groundings";
import { TOPIC_KEY_DIMENSIONS } from "@/lib/questions";

describe("aspect taxonomy conformance", () => {
  for (const [partyId, party] of Object.entries(GROUNDINGS)) {
    for (const [topicId, entries] of Object.entries(party.topics)) {
      it(`${partyId}/${topicId}: every aspect is a canonical id`, () => {
        const canonical = TOPIC_KEY_DIMENSIONS[topicId];
        for (const entry of entries) {
          expect(canonical.includes(entry.aspect)).toBe(true);
        }
      });
    }
  }
});
```

**Mock Patterns**:
- Mock external calls (Gemini, Langfuse, Slack webhooks) — never hit real network calls in tests
- When mocking a module whose own helper functions are called internally by the code under test (e.g. `lib/groundings.ts`'s `compareEntryQuality`), use `vi.mock(path, async (importOriginal) => ({ ...(await importOriginal()), <overrides> }))` — a plain object-literal mock breaks as soon as the code under test calls a real export you didn't stub. See `docs/learnings/project/NEXTJS-REACT-PATTERNS.md`.

**Coverage**: No hard threshold enforced — use judgment. Prioritize regression tests for AI-route schema conformance (a recurring real bug class here, see CHANGELOG 2026-07-02) and grounding-data invariants (schema conformance, taxonomy conformance) over coverage percentage for its own sake.

---

## *VERY IMPORTANT OPERATIONS GUIDELINES*

### Branching Workflow (Feature-Based Development)

**IMPORTANT**: All development work should happen on feature branches, not main.

**Branch Strategy**:
- **Main branch**: Protected, always deployable, tests must pass
- **Feature branches**: Short-lived (0.5-3 days), one per TODO item
- **Branch naming**: Auto-generated from TODO items with type prefixes
  - `feature/` - New features (default)
  - `fix/` - Bug fixes
  - `test/` - Test additions
  - `docs/` - Documentation
  - `refactor/` - Code refactoring

**Complete Workflow**:

```
┌─────────────────────────────────────────────────────────┐
│ 1. START: Create feature branch from TODO               │
│    /start → feature/slack-integration                    │
│    - Auto-extracts branch name from TODO item             │
│    - Prompts if name is ambiguous/too long                │
│    - Creates and checks out branch                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 2. WORK: Develop on feature branch                       │
│    - Make changes, commit as needed                        │
│    - Run tests locally during development (optional)       │
│    - Use /checkpoint periodically (see below)               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 3. CHECKPOINT: Save work-in-progress (optional)           │
│    /checkpoint                                             │
│    - Stashes uncommitted changes                            │
│    - Syncs with main (offers to merge if diverged)           │
│    - Runs full test suite (vitest + tsc + eslint)             │
│    - Commits and pushes branch to GitHub                       │
│    - Safe to switch sessions or take breaks                     │
│                                                          │
│    When to checkpoint:                                   │
│    - Before switching sessions (local ↔ web)             │
│    - After 5-7 commits or 45-60 min of work              │
│    - Before risky operations (major refactors)           │
│    - When suggested by Claude                            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 4. SWITCH: Work on different branch (optional)          │
│    /switch                                               │
│    - Lists all local and remote feature branches         │
│    - Auto-stashes uncommitted changes                     │
│    - Switches to selected branch                         │
│    - Restores stashed changes if returning to branch     │
│    - Enables parallel work on multiple features          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 5. WRAPUP: Merge to main and complete session           │
│    /wrapup                                               │
│    - Updates main branch (git pull)                      │
│    - Merges main into feature (conflict resolution)      │
│    - Runs FULL test suite (MANDATORY - blocks if fails)  │
│    - Merges feature → main                               │
│    - Pushes main + feature branch to GitHub              │
│    - Deletes local branch (keeps remote for history)     │
│    - Updates CHANGELOG, TODO, learnings                  │
│    - Commits documentation to main                       │
└─────────────────────────────────────────────────────────┘
```

**Key Principles**:
- ✅ **Always start with `/start`** - Auto-creates feature branch from TODO
- ✅ **Checkpoint frequently** - Enables safe multi-session work
- ✅ **Tests must pass** - Cannot checkpoint/wrapup with failing tests
- ✅ **Sync with main** - Reduces merge conflicts (offered at checkpoint/wrapup)
- ✅ **Keep branches** - Remote branches kept for 30 days (historical reference)
- ✅ **Use vi for conflicts** - WSL-friendly conflict resolution workflow

**Multi-Session Workflow**:
```bash
# Morning - Local WSL
/start → feature/slack-integration
... work 2 hours ...
/checkpoint → pushes to GitHub

# Afternoon - Claude Code Web
/continue → pulls feature/slack-integration
... work 1 hour ...
/checkpoint → pushes updates

# Evening - Local WSL
git pull origin feature/slack-integration (or just /start and continue)
... finish work ...
/wrapup → merges to main
```

**Parallel Branch Workflow**:
```bash
# Work on feature A
/start → feature/slack-integration
... work ...
/checkpoint

# Switch to feature B
/switch → choose or create feature/redis-caching
... work ...
/checkpoint

# Switch back to A
/switch → feature/slack-integration
... continue ...
/wrapup → merge feature A

# Later, finish B
/switch → feature/redis-caching
/wrapup → merge feature B
```

**Emergency Hotfix** (rare - main branch work):
- If you need to work directly on main (hotfix), just commit as before
- `/wrapup` detects main branch and skips merge workflow
- Consider using `/start` even for hotfixes (creates `fix/hotfix-name` branch)

---

### Standard Operations

- **Context compacting**: Re-read this CLAUDE.md file + `docs/learnings/INDEX.md`, then tell user you've re-read it
- **Wrapping up behavior**: Use `/wrapup` slash command which handles:
  1. **Feature branch merge** (if on feature branch - see workflow above)
  2. Session retrospective assessment
  3. CHANGELOG updates with all work done
  4. TODO cleanup (see TODO maintenance rules below)
  5. Learning files updates in `docs/learnings/` (distilled principles, not narratives)
  6. Commit and push documentation changes
  7. Report completion summary
- **Session start**: Use `/start` command (reads TODO, loads relevant learnings, **creates feature branch**, executes or plans)
- **Crash recovery**: Use `/continue` command (restores from ops/SAVED.md if it exists)
- **Learning system**:
  - Universal learnings in `docs/learnings/universal/` (from template, rarely changes)
  - Project learnings in `docs/learnings/project/` (evolves with this project)
  - INDEX.md provides quick reference (read at session start)
  - **Primary consumer**: Claude Code (these change how I work, not user documentation)

### TODO.md Maintenance Rules

**Structure** (3 sections, do not add others):
- **✅ Recently Completed** → **📋 Backlog** → **📚 Reference**

**Recently Completed**:
- Exactly 3 items, one line each (brief: what + date)
- When adding: remove oldest (bottom), add newest at top
- Moved-from items go to CHANGELOG.md (keeping detail)

**Backlog**:
- Single numbered list, ordered by priority (top = do next)
- Blocked/conditional items marked inline with ⏸️ and `— _blocked on: [condition]_`
- When completing an item: move to Recently Completed (rotating out oldest), remove from Backlog
- New items: insert at appropriate priority position, not just appended
- When user approves a plan: add as backlog item(s) at appropriate priority

**Reference**:
- Strategy doc links, completed milestones, guardrails, future ideas
- Rarely changes — only during strategy shifts or milestone completion

---

## *API ROUTE GUIDELINES*

### API Route Development (`app/api/<name>/route.ts`)

- Validate request body shape before use (see `app/api/score-topics/route.ts`'s `INVALID_INPUT` check)
- Sanitize any user-supplied free text before it reaches an AI prompt (`lib/sanitize.ts`'s `sanitizeUserInput`)
- Return a structured `{ errorCode, ... }` on failure, not a bare error string — the frontend switches on `errorCode` (`QUOTA_EXCEEDED`, `SERVER_ERROR`, `AUTH_ERROR`, `INVALID_INPUT`)
- Every Gemini-backed route: use `responseMimeType: "application/json"` + `responseJsonSchema`/`responseSchema` — never rely on prompt instructions alone to produce valid JSON (see CHANGELOG 2026-07-02 for the production incident this fixed)
- Wrap the Gemini call in a Langfuse trace/generation; never pass raw user answers as trace `input` (PII) — pass only metadata
- On error: log to Langfuse (`generation?.update({ output: msg, level: "ERROR" })`) and notify Slack via `lib/slack.ts`'s `notifySlack()` for anything user-facing

**Testing API Routes**:
- Test exported pure functions directly (`buildScoringPrompt`, `buildGroundingsForParties`, schema builders) rather than spinning up the route handler
- Mock `@google/genai`, `langfuse`, and `lib/slack.ts` — never call the real Gemini API or post to real Slack in tests
- Schema-conformance tests (`tests/*ResponseSchema.test.ts`) guard the exact shape sent to Gemini's `responseJsonSchema` — these exist because a subtly wrong schema silently produces malformed output in production, not because of a coverage target
