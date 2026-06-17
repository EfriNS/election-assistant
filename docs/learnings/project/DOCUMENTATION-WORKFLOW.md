# Documentation Workflow - Project-Specific Patterns

Patterns for managing TODO, backlog, and planning documents in Contendre project.

---

## User Collaboration Patterns

### "Document Now, Decide Later" Preference (#first:2025-11-24)

**What happened**: During product review discussion, user preferred documenting pricing proposals and beta testing plans without committing to execution timeline.

**Pattern observed**:
- User wants recommendations captured in detail (pricing analysis, beta plan specs)
- Decision deferred until value validated with real customers
- Rationale: "I want to be convinced myself" before executing uncertain initiatives

**Lesson**: When proposing changes with uncertainty (pricing, new features, beta testing):
1. ✅ Document full proposal with analysis (rationale, risks, alternatives)
2. ✅ Mark status as "DEFERRED - Validate X first"
3. ✅ Specify conditions for revisiting (e.g., "after 20-30 customers acquired")
4. ❌ Don't push for immediate execution if user expresses uncertainty

**Application**: Added pricing proposal to REQUIREMENTS.md with "Status: DEFERRED" and clear revisit conditions. Same for BETA_TESTING_PLAN.md.

---

## TODO Structuring

### Explicit Parallelization Opportunities (#first:2025-11-24)

**What happened**: After discussing Phase 1b and 1.5 execution, identified 1-2 week time savings if phases overlapped starting Week 2.

**Pattern observed**:
- Parallelization wasn't obvious from TODO structure alone
- User asked "Does it make sense to execute phases in parallel?"
- Analysis revealed low-risk overlap opportunity (different files, no conflicts)

**Lesson**: When structuring multi-phase TODOs:
1. ✅ Analyze parallelization opportunities proactively
2. ✅ Add explicit note in TODO with benefit ("saves 1-2 weeks"), risk ("LOW - different files"), and strategy
3. ✅ Don't assume user will identify parallelization independently
4. ✅ Consider: File overlap, dependency chains, merge conflict risk

**Application**: Added parallelization note to TODO.md: "Phase 1b and Phase 1.5 can run in parallel starting Week 2 - Benefit: saves 1-2 weeks, Risk: LOW"

---

## Product Review Translation

### PM Recommendations Need Concrete TODO Items (#first:2025-11-24)

**What happened**: Product review provided high-level recommendations (e.g., "Fix Slack UX gaps", "Reduce setup friction"). Needed translation to actionable TODO items with time estimates.

**Pattern observed**:
- Abstract recommendations → Hard to start implementation
- Concrete tasks with time estimates → Clear execution path
- User approved concrete breakdown without requesting changes

**Lesson**: When translating product review / PM analysis:
1. ✅ Break high-level recommendations into 3-7 day tasks
2. ✅ Add time estimates for each task (e.g., "3 days", "5-7 days")
3. ✅ Specify success criteria per phase (e.g., "Reduce churn 12% → <8%")
4. ✅ Create separate backlog specs for complex phases (detailed implementation plans)
5. ❌ Don't leave recommendations as abstract goals without actionable steps

**Application**:
- Phase 1b: 3 tasks (3 days, 2 days, 2 days) with file:line references
- Phase 1.5: 4 tasks (5-7 days, 2-3 days, 2-3 days, 2-3 days)
- Created `backlog/PHASE_1B_SLACK_UX_IMPROVEMENTS.md` with implementation details

---

## Large Documentation Commits

### Single Large Commit vs Multiple Small Commits (#first:2025-11-24)

**What happened**: Session resulted in single 7,456-line commit (10 new files + 3 modified).

**Trade-offs**:
- ✅ Atomic: All product review changes in one commit (easy to revert if needed)
- ✅ Clear feature branch: `feature/product-review-todo-adjustments` groups related work
- ❌ Large diff: Harder to review individual decisions
- ❌ Could have broken into: (1) Create backlog specs, (2) Update TODO/DEVELOPMENT_BACKLOG, (3) Add pricing proposal

**No clear lesson yet**: Need more data points to determine best practice. Consider:
- If documentation changes are tightly coupled → Single commit OK
- If documentation changes are independent → Multiple commits better

**Defer decision**: Monitor in future sessions whether large documentation commits cause review friction.
