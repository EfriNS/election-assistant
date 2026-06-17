# Testing & QA Learnings

**Purpose**: Universal testing principles that apply across all projects and tech stacks.

**Project-specific patterns**: See `docs/learnings/project/TESTING-PATTERNS.md` for React/Vitest/Playwright specifics.

---

## Core Principles

### Verification & Validation

1. **Never declare success without verification** - Build passing ≠ functional success. Always verify actual behavior matches intent before marking complete.
   [Cross-cutting: DEBUGGING #1-2, CI-CD #5]
   (#first:2025-10-20 #reinforced:2025-10-21,2025-10-23,2025-12-03)

2. **QA mindset over test fixing** - Understand what component SHOULD do, question test validity, don't just make tests pass. (#first:2025-10-15 #reinforced:2025-10-19,2025-10-23)

3. **Read component/module first, then write tests** - Understanding actual behavior saves 20+ minutes vs trial-and-error fixing. Reveals invalid tests for non-existent features.
   [Cross-cutting: DEBUGGING #9]
   (#first:2025-10-15 #reinforced:2025-10-19)

4. **Remove stale tests instead of making them pass** - Test maintenance includes deleting tests that no longer reflect reality. (#first:2025-10-15)

### What to Test

5. **Test business logic, not library internals** - Don't test third-party validation - test YOUR processing logic. Focus on integration points, not library behavior. (#first:2025-10-15)

6. **Test components must match production error patterns** - Test components should mirror production async handlers with try-catch, not simplified inline handlers. (#first:2025-10-16)

7. **Test gaps reveal architecture quality** - 0% coverage on services = hard to test = bad design. Use coverage as architecture quality metric. (#first:2025-10-21)

### Test Selectors & DOM Queries

8. **Use composite selectors for complex UI** - Text appears multiple times. Use `getAllByRole().find()` with composite criteria (text + attributes, role, state) instead of assuming uniqueness. (#first:2025-10-23)

9. **Always verify text uniqueness before using getByText** - Complex components have duplicate text. Default to composite selectors over simple text queries. (#first:2025-10-23 #reinforced:2025-10-26)

10. **Wait for transient UI elements before assertions** - Toast notifications, loading spinners, animations cause strict mode violations if matched by test selectors. Wait for them to disappear before checking stable content. (#first:2025-10-23)

11. **Use getAllByText().length > 0 for duplicate elements** - When values appear in multiple places, use `getAllByText()` and check length instead of `getByText()`. Handles duplicates gracefully. (#first:2025-10-26)

### Test Development Process

12. **TDD means understand → observe → assert** - Document test purpose (user scenario) → Check actual app behavior → Write assertions based on observed reality → Report findings. (#first:2025-10-19)

13. **Progressive testing: fix existing tests before adding new ones** - Always ensure existing test suite passes before adding new functionality tests. Pattern: (1) Fix failing tests, (2) Commit stable state, (3) Add new targeted tests. (#first:2025-11-04)

13a. **Run tests immediately after API changes, not at end** - When making breaking changes (renaming fields, changing function signatures), run tests right away to see full impact. Don't wait until "implementation complete" - test failures reveal scope of changes needed. Saves time by catching all affected code early.
   (#first:2025-12-03)

   **Session 2025-12-03**: Implemented competitor config restructure (vendor_sites → supported). Waited until end to run tests, discovered 28 failures across 3 test files. If tested immediately, would have seen full scope and updated tests incrementally. "Implementation complete" without tests = false confidence.

13b. **Unit + integration tests ≠ production-ready** - Passing tests validate individual components, not end-to-end workflows. Before declaring "ready for production/beta", identify critical user flows and plan E2E validation. Unit tests pass ≠ Docker installation works ≠ config persists ≠ daily scraper runs.
   (#first:2025-12-03)

   **Session 2025-12-03**: Completed MCP mode implementation, all 850 tests passing. User asked "what about E2E tests?" - realized gap: no validation that MCP installation works, volumes persist, daily workflows complete. Tests validate code correctness, not deployment success. E2E gap should have been identified in planning, not after "implementation complete".

14. **Don't skip tests, fix or document complexity** - When tests seem impossible, ask user "is this feature implemented?" before skipping. (#first:2025-10-19)

15. **Run lint before committing test files** - Test files trigger lint errors just as often as production code. Tests are code - hold them to same standards. (#first:2025-10-31 #reinforced:2025-10-31)

16. **Create working test before modifying behavior** - When debugging behavior, create isolated test demonstrating CURRENT behavior before making changes. Prevents making things worse, provides clear baseline for verification.
   (#first:2025-11-28)

   **Session 2025-11-28**: Attempted to simplify Slack validation → broke file uploads. User demanded: "create /tmp/test_slack_upload.py that works, before making any more changes." Working test proved files_upload_v2 REQUIRES channel IDs, not names. Test revealed channels:read + groups:read scopes mandatory.

### Test Infrastructure

17. **Test directory organization by tool boundaries** - Clear separation by tool (e2e/, src/__tests__/integration/, src/__tests__/unit/) reduces cognitive load. (#first:2025-10-23)

18. **Document tool constraints with examples** - When encountering tool limitations, create pattern reference library with ❌/✅ examples, don't fight the tool. (#first:2025-10-23)

19. **Fast local iteration beats slow CI debugging** - Running single test locally vs full CI = 60x+ speedup. CI is for validation, not debugging. (#first:2025-10-25)

20. **One test focus during debugging** - Debug with single failing test, not full suite. Apply fix to all tests after confirming locally. Faster feedback, clearer failure signals. (#first:2025-10-25)

21. **Git history is ground truth when tests break** - If tests worked last week, `git diff` working vs broken code immediately reveals the issue. Don't guess - compare to known-working version first. (#first:2025-10-25)

22. **Never assume helper functions work** - When tests fail mysteriously, verify foundational helpers match patterns from when tests passed. Helpers can break when "improving" them. (#first:2025-10-25)

### Test Coverage & Metrics

23. **Coverage thresholds prevent regression** - Set conservative baseline thresholds that match current reality, fail CI if coverage drops. Raise thresholds progressively. (#first:2025-10-24)

24. **Coverage infrastructure setup before baseline measurement** - Configure tools before measuring baseline. Infrastructure ready = consistent metrics. (#first:2025-10-24)

25. **Component coverage ≠ project coverage** - One component at 83% with 30 untested components = ~23% overall. Always measure at the scope you care about. (#first:2025-10-26)

26. **Dead code removal beats testing dead code** - Systematic grep verification identifies unused code. Testing dead code provides zero business value. Senior QA asks "should this code exist?" (#first:2025-10-26)

27. **Plans need reality checks** - Re-read goals periodically during execution to catch scope mismatches early. Believing "83% complete" when only 1 of 30 components tested. (#first:2025-10-26)

28. **Systematic QA approach over blind test addition** - Analyze uncovered code systematically: why uncovered? dead code likelihood? business value? test effort? Create function-by-function analysis before writing tests. (#first:2025-10-26)

29. **Analyze codebase composition BEFORE setting coverage targets** - Read coverage reports by directory BEFORE planning. Identify largest untested files, categorize as business logic vs UI vs integration, estimate realistic gains per layer. (#first:2025-10-29)

30. **Testing pyramid layers have different volumes** - Business logic (~30%): easy to test, high ROI. UI components (~40%): moderate difficulty, medium ROI. Page integrations (~30%): hard to test, low ROI per hour. Volume matters more than individual module percentages. (#first:2025-10-29)

31. **Module coverage ≠ project coverage due to volume** - High module coverage + low project coverage = you tested the RIGHT things but not ENOUGH things. Always measure both: module coverage (quality) and project coverage (breadth). (#first:2025-10-29)

32. **Coverage gains plateau with diminishing returns** - Monitor ROI per session: if adding 100 tests yields <1pp gain, switch strategies. (#first:2025-10-30)

### Test Execution & Debugging

33. **Read error context files before debugging** - Check error-context files and screenshots first before assuming backend issues.
   [Cross-cutting: DEBUGGING #6, AI-PROMPTS #6]
   (#first:2025-10-19)

34. **Full test suites belong in CI, not interactive dev** - Don't wait >2 minutes locally. Run specific tests during development, full suite in CI. (#first:2025-10-19)

35. **Phase large test initiatives by business impact** - "138-180 hours" is paralyzing. "Phase 1: Critical paths (44h)" is achievable. P0 (critical) → P1 (high) → P2 (medium) → P3 (nice-to-have).
   [Cross-cutting: PROCESS #14, DEBUGGING #8]
   (#first:2025-10-21)

36. **Senior QA skepticism reveals critical gaps** - Question whether tests actually verify core functionality vs just opening modals. Skeptical code review finds what completion checklists miss.
   [Cross-cutting: PROCESS #1,4,8, CI-CD #4, DEBUGGING #4]
   (#first:2025-10-24)

37. **Test isolation requires explicit opt-in for production paths** - Never default to production directories in test code. Make tests pass explicit paths (tmp_path) or they'll pollute production data. Cache/save operations should require explicit directory parameter (None = no auto-save for tests).
   [Cross-cutting: DEBUGGING #2, ARCHITECTURE #1]
   (#first:2025-11-16)

---

## Anti-Patterns to Avoid

- ❌ Making tests pass without understanding what component actually does
- ❌ Assuming text is unique in DOM - use `getByText` cautiously
- ❌ Testing third-party library internals instead of your integration points
- ❌ Using simplified test patterns that don't match production code
- ❌ Fighting tool constraints instead of documenting patterns
- ❌ Running full test suites locally during development
- ❌ Skipping "impossible" tests without verifying feature exists
- ❌ Assuming component coverage means project coverage
- ❌ Testing dead code instead of removing it
- ❌ Executing plans without periodic reality checks
- ❌ Adding tests without analyzing which code paths are uncovered
- ❌ Creating new test patterns without searching for existing ones first
- ❌ Committing to coverage targets without analyzing codebase composition
- ❌ Treating all untested code equally (business logic vs UI vs pages have different ROI)
- ❌ Committing test files without running lint
- ❌ Adding tests to broken test suites without fixing existing failures first

---

## Development Workflow Integration

### When to Run Tests (Realistic Balance)

**ALWAYS Run Tests:**
- ✅ **Before deployment** (production changes) - NON-NEGOTIABLE
- ✅ **Before pushing to main/shared branches** - Prevents sharing broken code
- ✅ **After fixing a bug** - Verify fix works, consider adding regression test
- ✅ **After breaking API changes** - Run immediately to see full impact, not at end

**Sometimes Run Tests:**
- ⚠️ **During iteration** - If making 5-10 commits while building, don't test every commit (too slow)
- ⚠️ **Before local commits to feature branch** - Use judgment based on change risk

**Skip Testing:**
- ❌ Trivial copy changes
- ❌ CSS-only tweaks
- ❌ README/documentation updates

### Regression Test Decision Tree

**When you fix a bug, ask:**

1. **Could this bug happen again?**
   - User-facing failure? → YES
   - Silent data corruption risk? → YES
   - One-off environment issue? → NO
   - Typo in UI copy? → NO

2. **Is the test effort reasonable?**
   - < 15 minutes to write? → YES
   - Requires complex mocking of 5+ services? → NO
   - Can reuse existing test patterns? → YES

3. **What's the business impact?**
   - Prevents hours of future debugging? → HIGH
   - Prevents user-facing failures? → HIGH
   - Catches rare edge case? → MEDIUM
   - Just documents expected behavior? → LOW

**Decision Matrix:**
| Could Happen Again? | Test Effort < 15min? | Business Impact | Action |
|---------------------|----------------------|-----------------|--------|
| ✅ YES | ✅ YES | HIGH | **Always add** |
| ✅ YES | ✅ YES | MEDIUM | **Usually add** |
| ✅ YES | ❌ NO | HIGH | **Consider refactor** |
| ❌ NO | Any | Any | **Skip** |

## When to Apply These Principles

### Before Writing Tests
- ✓ Read the component/feature code first
- ✓ **Search for existing test patterns** (grep for similar tests)
- ✓ **Study similar passing tests** in same file or domain
- ✓ Understand expected behavior from user perspective
- ✓ Check if feature actually exists before writing test

### During Test Development
- ✓ Question test validity if fixing feels like hacking
- ✓ Use composite selectors for any text that might repeat
- ✓ Match production patterns (async/await, error handling)
- ✓ Check error context and screenshots before assuming issues

### When Tests Fail
- ✓ Verify the test is testing something real
- ✓ Check error context and screenshots first
- ✓ Consider if component behavior changed (update or delete test)
- ✓ Don't just make test pass - understand WHY it failed

### Planning Test Coverage
- ✓ **Analyze codebase composition first** (read coverage reports by directory)
- ✓ **Categorize untested code** (business logic vs UI vs integrations)
- ✓ **Understand testing pyramid volumes** (~30% base, ~40% middle, ~30% top)
- ✓ Phase by business impact (P0 → P1 → P2 → P3)
- ✓ Use coverage gaps to identify architecture issues
- ✓ **Measure both module and project coverage** (quality vs breadth)

---

## Related Topics

- **CI-CD**: Test execution in pipelines, local verification before push
- **DEBUGGING**: Error context reading, systematic troubleshooting
- **PROCESS**: Phased approach to large initiatives, user feedback signals
- **ARCHITECTURE**: Test gaps revealing design issues

---

**Last Updated**: 2025-01-07 (split universal from project-specific patterns)
**Sessions Covered**: 26+ retrospectives (2025-10-07 to 2025-11-06)
**Principles Count**: 35 universal principles
**Project Patterns**: See `docs/learnings/project/TESTING-PATTERNS.md`
