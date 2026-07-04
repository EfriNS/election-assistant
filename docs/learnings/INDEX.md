# Development Learnings Index

**Quick Reference**: Read this first when starting new sessions. Topics organized by universal (all projects) vs project-specific patterns.

**Structure**:
- `universal/` - Transferable principles (copied from template, rarely changes)
- `project/` - election-assistant specific patterns (Gemini structured-output routes, grounding data model, Next.js/Vitest specifics)

---

## Quick Wins (Most Impactful Principles)

These principles appear across multiple sessions and have prevented hours of wasted effort:

1. **MANDATORY: Run tests + lint before EVERY push** - No exceptions. `npx vitest run && npx tsc --noEmit && npx eslint .` before pushing. 5 min verification vs 15+ min CI debugging. [→ CI-CD](universal/CI-CD.md#local-verification-first) [→ CLAUDE.md](../CLAUDE.md#mandatory-pre-push-checklist)

2. **Never declare success without verification** - Build passing ≠ functional success. Verify actual behavior, database state, user confirmation before marking complete. [→ DEBUGGING](universal/DEBUGGING.md#verification-discipline) [→ TESTING](universal/TESTING.md#verification--validation)

3. **🛑 STOP before adding error handling/parsing** - Use Root Cause Investigation Checklist BEFORE writing try/except or parsing logic. Trace value to source → Fix upstream, not symptoms. [→ CODING-PRINCIPLES](universal/CODING-PRINCIPLES.md) [→ ARCHITECTURE](universal/ARCHITECTURE.md#no-workarounds-philosophy)

4. **User skepticism catches hidden failures** - When user questions suspicious metrics (timing, script output), investigate deeply. Their intuition catches what automated checks miss. [→ PROCESS](universal/PROCESS.md#user-feedback--collaboration) [→ CI-CD](universal/CI-CD.md#ci-behavior--debugging)

5. **Read components/context before writing tests** - Understanding actual behavior saves 20+ minutes vs trial-and-error. Reveals invalid tests for non-existent features. [→ TESTING](TESTING.md#what-to-test)

6. **Check existing codebase patterns first** - Grep for similar solved problems before implementing new solutions. Saves ~20 minutes of trial-and-error. [→ DEBUGGING](DEBUGGING.md#persistence--patterns)

7. **Token budget awareness for AI prompts** - Check prompt size BEFORE adding content. 20K prompt → 8K token limit → malformed JSON. [→ AI-PROMPTS](AI-PROMPTS.md#token-budget--prompt-design)

8. **Phase complex work with user checkpoints** - Break into phases (Infrastructure → Frontend → Deployment) with approval gates. Prevents scope creep, enables clear tracking. [→ PROCESS](PROCESS.md#planning--phasing)

9. **Use composite selectors for UI testing** - Text appears multiple times in complex UIs. Use `getAllByRole().find()` with composite criteria, not simple `getByText`. [→ TESTING](TESTING.md#test-selectors--dom-queries)

10. **Production data reveals AI behavior** - SQL queries show actual AI output patterns (40% period-only changes) better than theory. Start with data, not guesses. [→ AI-PROMPTS](AI-PROMPTS.md#validation--testing)

11. **Multi-source validation for competitive research** - Never rely on vendor-only sources (blog posts, marketing). 5+ independent sources minimum: user reviews, founder LinkedIn, community discussions, traction evidence. Shallow research is worse than no research. [→ COMPETITIVE-RESEARCH](universal/COMPETITIVE-RESEARCH.md#core-principle-multi-source-validation)

---

## By Topic

### [CODING-PRINCIPLES](universal/CODING-PRINCIPLES.md) - 12 Universal Principles ⭐ NEW
**High-impact implementation principles to prevent workarounds and over-engineering during coding phase.**

**Key Areas:**
- Root cause investigation checklist (mandatory before error handling)
- Over-engineering check (before extracting functions)
- Avoid workarounds at all costs
- Trust validated data
- Verify before declaring success
- Check existing patterns first

**When to Read**:
- ✅ **BEFORE implementing code** (after planning, before writing)
- ✅ **Before adding error handling** (try/except, catch blocks)
- ✅ **Before adding data parsing/validation** (regex, sanitization)
- ✅ **When data seems wrong** (appears malformed, needs complex processing)
- ✅ **Before extracting functions/creating utilities**
- ✅ **When tempted to add "just in case" logic** (fallbacks, defaults)

**Critical for**: Preventing symptom-fixing instead of root-cause fixes, avoiding defensive programming reflexes.

---

### [TESTING](universal/TESTING.md) - 35 Universal Principles + [Project Patterns](project/NEXTJS-REACT-PATTERNS.md)
Testing & QA learnings covering test development, selectors, infrastructure, and execution.

**Universal Principles:**
- Verification & validation discipline
- QA mindset over test fixing
- Composite selectors for complex UI
- Test directory organization by tool boundaries
- Coverage as architecture quality metric
- Phasing large test initiatives by business impact

**Project Patterns (Vitest/Next.js)**:
- See `project/NEXTJS-REACT-PATTERNS.md`'s Testing section for `vi.mock` + `importOriginal` (mocking a module whose own helpers the code-under-test calls internally)
- See `project/VAA-DESIGN.md` for grounding-data schema-conformance test patterns (`tests/aspectTaxonomy.test.ts`, `tests/groundingProvenance.test.ts`)
- Gemini structured-output routes are guarded by schema-conformance tests (`tests/*ResponseSchema.test.ts`) — see `project/AI-INTEGRATION.md`

**When to Read**: Before writing tests, when tests fail unexpectedly, planning test coverage initiatives.

---

### [CI-CD](universal/CI-CD.md) - 8 Universal Principles
CI/CD & deployment learnings covering workflows, debugging, and configuration.

**Key Areas:**
- Local verification before pushing
- CI timing anomalies indicate problems
- Cost optimization with paths-ignore
- Quality enforcement through CI failures

**When to Read**: Before modifying CI workflows, when CI behaves suspiciously, setting up deployments.

---

### [ARCHITECTURE](universal/ARCHITECTURE.md) - 11 Universal Principles
Architecture & design learnings covering simplicity, root cause fixes, and design decisions.

**Key Areas:**
- No workarounds philosophy
- Trust validated data
- Root cause investigation over symptom fixing
- Check guidelines before proposing solutions
- Separation of concerns (code and documentation)

**When to Read**: Before adding complexity, when encountering data issues, making design decisions.

---

### [DEBUGGING](universal/DEBUGGING.md) - 19 Universal Principles + [Project Patterns](project/ANALYTICS-PATTERNS.md)
Debugging & troubleshooting learnings covering verification, systematic investigation, and persistence.

**Key Areas:**
- Script success ≠ actual success (verify actual state) — also applies in reverse: a tool's *error* response can be a false negative too
- Verify actual state before destructive operations, not just command success (e.g. `git status` before checkout/reset/clean)
- Read error context before diagnosing root cause
- Test timeouts before assuming issues
- Check existing codebase patterns first
- Persistence in systematic debugging

**Project Patterns (Mixpanel/Analytics):**
- See `project/ANALYTICS-PATTERNS.md` for Mixpanel MCP server quirks (unreliable success/error signals, free-tier report cap, bulk-edit tool failures) and event schema gotchas (`aspects_probed` ↔ `TOPIC_KEY_DIMENSIONS`, Lexicon registration timing)

**When to Read**: When tests fail, data operations complete, debugging complex issues, before any destructive cleanup, when working with the Mixpanel MCP server.

---

### [PROCESS](universal/PROCESS.md) - 33 Universal Principles
Development workflow learnings covering user collaboration, session management, planning, and documentation.

**Key Areas:**
- User feedback redirects approaches positively
- Crash recovery through systematic context loading
- Parallel work during long-running tasks
- Phase-by-phase approach with checkpoints
- Document incrementally, not in batch
- Documentation needs enforcement mechanisms

**When to Read**: Session start, planning complex features, managing user collaboration, git operations.

---

### [COMPETITIVE-RESEARCH](universal/COMPETITIVE-RESEARCH.md) - Comprehensive Methodology ⭐ NEW
**Standards for thorough, credible competitive research that avoids vendor bias and surface-level analysis.**

**Key Areas:**
- Multi-source validation (5+ source types minimum)
- Founder and key people research (LinkedIn, background, product learnings)
- Company fundamentals (Crunchbase, funding, headcount, layoffs)
- User research (reviews, community discussions, direct quotes)
- Traction validation (revenue, customers, evidence-based)
- Quality checklist (when is research "complete")
- Anti-patterns to avoid (vendor-only sources, unvalidated claims)

**When to Read**:
- ✅ **Before any competitive/market research** (rare in this project, but the same discipline applies)
- ✅ **When research feels shallow** (only checked one source, no independent verification)
- ✅ **Before trusting a source's legitimacy for scoring/quoting** (see the election-assistant example below)
- ✅ **Strategic decisions** (build/don't build, pivot, positioning)

**Critical for**: Avoiding shallow research that leads to wrong strategic decisions. Shallow research is worse than no research.

**Reference Example (election-assistant)**:
- ❌ BAD: Assumed `ozma-yeudit.com` and a JVL-hosted PDF were עוצמה יהודית's official platform sources based on domain name and file title alone.
- ✅ GOOD: Fetched and read each source's actual self-description (footer, contact info) — revealed one was an unofficial supporter site and the other a third-party recruitment pamphlet. Re-collected from the real official site instead. See `project/VAA-DESIGN.md` item 72.

---

### [AI-PROMPTS](universal/AI-PROMPTS.md) - 6 Universal Principles
AI/LLM integration learnings covering token budgets, prompt design, validation, and testing.

**Key Areas:**
- Token budget awareness (check before adding content)
- Condensed examples maintain quality, save tokens
- Production data validation reveals AI behavior
- Iterative testing (expect 2-3 deploy→test→fix cycles)

**When to Read**: Before modifying AI prompts, when AI output seems wrong, debugging AI features.

---

## Cross-Cutting Themes

These patterns appear across multiple topic areas:

### 1. Verification Discipline
**Appears in**: TESTING, CI-CD, DEBUGGING, PROCESS
**Pattern**: Never declare success without verifying actual behavior, database state, or user confirmation.
**Manifestations**:
- Testing: Verify tests actually run correctly, not just pass
- CI-CD: Check CI logs match intended strategy (timing anomalies)
- Debugging: Verify database state after cleanup, not script messages
- Process: Verify implementation before documenting
- Design: A redesign proposal must be verified against a real baseline, not just ranked against other candidate redesigns — otherwise the comparison can't conclude "no change needed" (see `project/VAA-DESIGN.md` item 73)
- Debugging: A comparison tool's "same/equal" result is itself unverified until you confirm the extraction it's built on actually worked — two silently-empty values compared equal reads identical to two real values matching (see `universal/DEBUGGING.md` item 21's 2026-07-04 reinforcement)
- Debugging: A search engine's indexed description of a site is a claim about what it *was*, not what it *is* — a live fetch (and, for "is this abandoned," a Wayback Machine check) is what actually verifies a domain before recommending it (see `project/VAA-DESIGN.md` item 72's 2026-07-04 reinforcement)

### 2. No Workarounds Philosophy
**Appears in**: ARCHITECTURE, DEBUGGING, TESTING
**Pattern**: Find and fix root causes instead of adding fallbacks, defensive parsing, or complex logic that masks real problems.
**Manifestations**:
- Architecture: User catches "are we adding a fallback again???"
- Debugging: Fix token limits instead of JSON sanitization
- Testing: Document tool constraints instead of fighting them

### 3. User Feedback as Quality Signal
**Appears in**: TESTING, CI-CD, DEBUGGING, PROCESS, AI-PROMPTS
**Pattern**: User questions ("does this make sense?", "database still has garbage") reveal issues automated checks miss.
**Impact**: User skepticism has caught hidden CI failures, database cleanup bugs, test shortcuts, and over-engineering.

### 4. Investigation Before Implementation
**Appears in**: TESTING, DEBUGGING, PROCESS
**Pattern**: Read component first, check existing patterns, analyze relationships before writing code/tests/cleanup.
**Time Saved**: 20-30 minutes per instance by understanding before acting.

### 5. Phased Approach to Complex Work
**Appears in**: PROCESS, TESTING, CI-CD
**Pattern**: Break large initiatives into phases with clear checkpoints. Makes 138-180 hour efforts achievable as 44h Phase 1.
**Benefits**: Clear progress tracking, early course correction, scope control.

### 6. Local Verification Before Push
**Appears in**: CI-CD, TESTING, DEBUGGING
**Pattern**: Test locally with proper commands before pushing to CI. Catches syntax errors, config issues, workflow problems.
**Saves**: Multiple push cycles, CI runtime costs, debugging time.

---

## Statistics

- **Total Universal Principles**: 121 across all topics (CODING-PRINCIPLES: 12, TESTING: 35, PROCESS: 33, DEBUGGING: 19, ARCHITECTURE: 15, CI-CD: 8, AI-PROMPTS: 6) — inherited from the template, largely unaudited for this project
- **Comprehensive Methodologies**: 1 (COMPETITIVE-RESEARCH: multi-source validation framework — see the election-assistant example under that section above)
- **Project-Specific Patterns**: `project/VAA-DESIGN.md` (78+ items — the primary, most actively maintained file), plus `NEXTJS-REACT-PATTERNS.md`, `INFRA-PATTERNS.md`, `ANALYTICS-PATTERNS.md`, `AI-INTEGRATION.md`
- **Cross-Cutting Themes**: 6 major patterns
- **Most Reinforced**: "Avoid workarounds at all costs" (added checklist to CLAUDE.md)
- **Most Impactful**: "Root cause investigation over symptom fixing" (prevented hours of technical debt)

**Organization**:
- `universal/` - Principles that apply to all projects (copy to new projects)
- `project/` - election-assistant specific patterns (Gemini structured-output routes, grounding data model, Next.js/Vitest specifics)

---

## How to Use This Learning System

### For `/start` Command
1. Read this INDEX.md for quick orientation
2. Based on your TODO item, read relevant topic files:
   - **Implementation/coding task?** → Read `universal/CODING-PRINCIPLES.md` FIRST (before writing code)
   - Testing task? → Read `universal/TESTING.md`, then `project/TESTING-PATTERNS.md` if exists
   - CI/CD work? → Read `universal/CI-CD.md`
   - Architecture refactor? → Read `universal/ARCHITECTURE.md`
   - Debugging? → Read `universal/DEBUGGING.md`
3. Scan "When to Read" sections to identify relevant principles

### During Implementation Phase
**Before writing code** (after exploration/planning):
1. Read `universal/CODING-PRINCIPLES.md` to refresh anti-workaround mindset
2. Refer to 🛑 STOP boxes in CLAUDE.md when adding:
   - Error handling (try/except)
   - Data parsing/validation (regex, sanitization)
   - Functions/utilities (abstractions)
   - Fallbacks/defaults ("just in case" logic)
3. Use mandatory checklists BEFORE making changes (Root Cause Investigation, Over-Engineering Check)

### For `/wrapup` Command
1. For EACH learning, ask: "Would this apply to other projects?"
   - ✅ Universal → Update `universal/` (rarely, be conservative)
   - ❌ Project-specific → Update `project/` (freely)
2. Update relevant files:
   - Add new principle if fundamental insight discovered
   - Update existing principle with reinforcement tag if reinforced
   - Add reference example if particularly illustrative
3. Date tag format: `(#first:YYYY-MM-DD #reinforced:YYYY-MM-DD,YYYY-MM-DD)`
4. Update this INDEX.md only if new cross-cutting theme emerges

---

## Ongoing Maintenance

### After Each Session
- Extract 1-3 key learnings
- Add to appropriate topic file (update principle or add example)
- Add date tags to reinforced principles (#YYYY-MM-DD)
- Check if new cross-cutting pattern emerges

### File Size Management
- Keep each topic file under 500 lines
- Split if file grows too large (create subtopics)
- Archive older detailed examples if necessary
- Maintain principle density (distilled insights, not narratives)

---

**Last Updated**: 2026-07-04 (pre-launch legal/privacy risk review session — added project/VAA-DESIGN.md items 77-78: for an Israeli VAA, undisclosed data practices are the real legal exposure (Amendment 13 names political opinions as specially-sensitive data; the mako "מצפן הבחירות" precedent was about disclosure, not perceived bias), and gate a feature on a not-yet-true external dependency behind one flag rather than shipping a temporarily-dead link; reinforced item 72 with a second live-fetch-plus-Wayback-check verification (shas.org.il: search results said "the party site," live fetch said `ECONNREFUSED`, Wayback said abandoned since 2022); added universal PROCESS.md item 42 — don't default to team-scale SLA commitments in user-facing copy without checking who's actually the operator (removed a "5 business days" response commitment after the user, a solo maintainer, pointed out it didn't fit); added a Debugging manifestation to Cross-Cutting Theme 1 (Verification Discipline))

**Previously**: 2026-07-04 (content-sharpening + infra session — added project/VAA-DESIGN.md item 76: verify real-world political alignment before merging two conflict axes into one scored option, don't assume topical similarity means correlated scoring; reinforced item 63 (`lib/parties.ts`/grounding drift recurred in production-visible form — Hadash and Otzmah Yehudit both missing `platformUrl` despite `platformAvailable: true`) and flagged a regression test as the next step rather than relying on the existing manual checklist; reinforced universal DEBUGGING.md item 21 with the opposite-direction failure mode — a "same value" comparison built on a silently-failed extraction (`vercel env pull` returning every secret as an empty string) is not evidence, caught only via user pushback; added a Debugging manifestation to Cross-Cutting Theme 1 (Verification Discipline))

**Previously**: 2026-07-03 (UX/UI review exploration — added project/VAA-DESIGN.md items 73-75: always include a real baseline when comparing design alternatives, a validated interaction mechanic sharply limits how much "journey" redesign is actually available, and concluding "no redesign needed" after a good-faith exploration is a valid outcome; added universal DEBUGGING.md Example 6 — a toggle-visibility bug recurred in a second instance before its root cause was generalized; added a Design manifestation to Cross-Cutting Theme 1 (Verification Discipline))

**Previously**: 2026-07-02 (closed the aspect-taxonomy loop in project/VAA-DESIGN.md — item 60's "not yet implemented" fix now shipped, items 68-70 on taxonomy-design validation and static-vs-dynamic constraint ownership; updated project/AI-INTEGRATION.md — corrected the 2026-06-30 `responseMimeType`-only JSON fix, now documents `responseJsonSchema` as the actual fix for Hebrew-acronym escaping failures; added project/INFRA-PATTERNS.md section on Vercel Sensitive env vars, Langfuse indexing lag, and env-value comparison pitfalls; added universal ARCHITECTURE #17 and AI-PROMPTS #7; reinforced universal DEBUGGING #20)
**Structure Change (2026-07-03)**: `project/` had been inherited from an unrelated Python/MCP-server project template ("Contendre") and never fully genericized — files with nothing salvageable for this Next.js app were deleted (`CONFIG-PATTERNS.md`, `DOCKER-PATTERNS.md`, `MCP-TESTING-PATTERNS.md`, `SCRAPING-PATTERNS.md`, `DOCUMENTATION-WORKFLOW.md`); `AI-INTEGRATION.md` had its real election-assistant section kept and its stale Python section removed. Remaining `project/` files (`VAA-DESIGN.md`, `NEXTJS-REACT-PATTERNS.md`, `INFRA-PATTERNS.md`, `ANALYTICS-PATTERNS.md`, `AI-INTEGRATION.md`) are genuinely about this project. `universal/` was left untouched — it's explicitly meant to hold generic, template-level principles regardless of which project's examples illustrate them.

**Structure Change (2025-01-07)**:
- Split learnings into `universal/` (transferable) and `project/` (project-specific)
- Updated date tag format to `#first:` and `#reinforced:` for better tracking
- Universal files rarely change, project files evolve freely
