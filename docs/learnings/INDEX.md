# Development Learnings Index

**Quick Reference**: Read this first when starting new sessions. Topics organized by universal (all projects) vs project-specific patterns.

**Structure**:
- `universal/` - Transferable principles (copied from template, rarely changes)
- `project/` - Contendre specific patterns (Python scrapers, MCP integration, competitive intelligence)

---

## Quick Wins (Most Impactful Principles)

These principles appear across multiple sessions and have prevented hours of wasted effort:

1. **MANDATORY: Run tests + lint before EVERY push** - No exceptions. `pytest --tb=short && black --check src/ tests/ && ruff check src/ tests/ && mypy src/` before pushing. 5 min verification vs 15+ min CI debugging. [→ CI-CD](universal/CI-CD.md#local-verification-first) [→ CLAUDE.md](../CLAUDE.md#mandatory-pre-push-checklist)

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

### [TESTING](universal/TESTING.md) - 35 Universal Principles + [Project Patterns](project/TESTING-PATTERNS.md)
Testing & QA learnings covering test development, selectors, infrastructure, and execution.

**Universal Principles:**
- Verification & validation discipline
- QA mindset over test fixing
- Composite selectors for complex UI
- Test directory organization by tool boundaries
- Coverage as architecture quality metric
- Phasing large test initiatives by business impact

**Project Patterns (Python/MCP/Web Scraping/Docker):**
- See `project/SCRAPING-PATTERNS.md` for web scraping specifics
- See `project/MCP-TESTING-PATTERNS.md` for MCP integration testing
- See `project/DOCKER-PATTERNS.md` for Docker build optimization and E2E testing
- robots.txt compliance patterns
- requests-cache integration for daily scraping
- Competitor-specific scraping strategies (Airbyte allowed, Fivetran blocked)

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

### [DEBUGGING](universal/DEBUGGING.md) - 19 Universal Principles
Debugging & troubleshooting learnings covering verification, systematic investigation, and persistence.

**Key Areas:**
- Script success ≠ actual success (verify actual state)
- Verify volume state before destructive cleanup (Docker volumes persist)
- Read error context before diagnosing root cause
- Test timeouts before assuming issues
- Check existing codebase patterns first
- Persistence in systematic debugging

**When to Read**: When tests fail, data operations complete, debugging complex issues, before Docker volume cleanup.

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
- ✅ **Before any competitive research** (analyzing competitors, market validation)
- ✅ **When research feels shallow** (only checked website, no user voice)
- ✅ **Before validation journal entries** (Entry 008, Entry 009 quality standard)
- ✅ **Strategic decisions** (build/don't build, pivot, positioning)

**Critical for**: Avoiding shallow research that leads to wrong strategic decisions. Shallow research is worse than no research.

**Reference Examples**:
- ✅ GOOD: Entry 008 (Crayon MCP - 17+ sources, user quotes, validated traction)
- ✅ GOOD: Entry 009 (CompetitorIQ - 10+ sources, $35K ARR validated, founder deep-dive)
- ❌ BAD: Initial Crayon research (2 blog posts only - user called it "sloppy")
- ❌ BAD: Initial ForesightIQ research (website only - missed entire company)

**Application to Contendre Product**: Multi-source validation + direct attribution + confidence scoring = what makes research credible (our differentiation vs shallow tools).

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

- **Total Universal Principles**: 121 across all topics (CODING-PRINCIPLES: 12, TESTING: 35, PROCESS: 33, DEBUGGING: 19, ARCHITECTURE: 15, CI-CD: 8, AI-PROMPTS: 6)
- **Comprehensive Methodologies**: 1 (COMPETITIVE-RESEARCH: multi-source validation framework)
- **Project-Specific Patterns**: 35 (TESTING-PATTERNS.md: 31, MCP-TESTING-PATTERNS.md: 4)
- **Sessions Analyzed**: 28+ (2025-10-07 to 2025-12-26)
- **Cross-Cutting Themes**: 6 major patterns
- **Most Reinforced**: "Avoid workarounds at all costs" (6+ sessions, added checklist to CLAUDE.md)
- **Most Impactful**: "Root cause investigation over symptom fixing" (prevented hours of technical debt)
- **Newest Addition**: COMPETITIVE-RESEARCH.md (2025-12-26) - prevents shallow research that leads to wrong strategic decisions

**Organization**:
- `universal/` - Principles that apply to all projects (copy to new projects)
- `project/` - Contendre specific patterns (web scraping, MCP server, competitive intelligence)

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

### For `/continue` Command (Crash Recovery)
1. Read this INDEX.md for quick context
2. Optionally scan topic relevant to saved work context
3. Use principles to inform continuation strategy

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

**Last Updated**: 2025-12-26 (added universal/COMPETITIVE-RESEARCH.md - comprehensive multi-source validation methodology from Entry 008/009 learnings)
**Archive**: Full retrospective history available in [RETROSPECTIVES-2025-10-archive.md](../../RETROSPECTIVES-2025-10-archive.md)

**Structure Change (2025-01-07)**:
- Split learnings into `universal/` (transferable) and `project/` (Contendre specific)
- Updated date tag format to `#first:` and `#reinforced:` for better tracking
- Universal files rarely change, project files evolve freely
