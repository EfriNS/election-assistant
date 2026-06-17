# Coding Principles (Implementation Phase)

**Purpose**: High-impact principles to prevent workarounds, over-engineering, and symptom-fixing during code implementation.

**When to Read**:
- ✅ **Before implementing code** (after planning phase, before writing)
- ✅ **Before adding error handling** (try/except, catch, defensive code)
- ✅ **Before adding data parsing/formatting** (regex, sanitization, complex logic)
- ✅ **When data seems wrong** (needs validation, appears malformed)
- ✅ **When tempted to add "just in case" logic** (fallbacks, defaults, workarounds)

**Quick Check**: If you're about to add `try/except`, parsing logic, or fallback handling → Read this file first.

---

## 🛑 MANDATORY CHECKLISTS

### Root Cause Investigation Checklist

**Before fixing ANY test failure, error, or unexpected behavior, complete this checklist:**

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
   - "Add a try/except around..."
   - "Parse the output with regex..."
   - "Add a fallback for when..."
   - **STOP**: Investigate root cause instead

**Example**:
- ❌ Bad: "ChromaDB returns >1.0, change test to `<= 1.001`"
- ✅ Good: "Trace back → embedding_manager.py:224 formula → ChromaDB returns tiny negative distances → Add clamping in application code"

---

### Over-Engineering Check

**Before extracting functions, adding abstractions, or creating utilities:**

1. **Need verification**:
   - Is this logic used in 3+ places? (If <3, keep inline)
   - Does it add actual user value?
   - Am I solving a real problem or hypothetical future need?

2. **Simplicity check**:
   - Can I use platform/library features instead?
   - Is inline code clearer than abstraction?
   - Will this make debugging harder?

3. **Red flags**:
   - "We might need this later..."
   - "Let me create a helper for this..."
   - "This makes it more flexible..."
   - **STOP**: Implement the simplest solution first

**Remember**: Three similar lines of code is better than a premature abstraction.

---

### Test Coverage Checklist

**MANDATORY: After implementing ANY code changes, add tests BEFORE moving on:**

1. **What changed?**
   - New function/class? → Add unit tests
   - Modified existing logic? → Update existing tests + add regression test
   - New API/integration? → Add integration tests
   - CLI flag/option added? → Add CLI tests (or document manual validation)

2. **Test coverage verification**:
   - Run tests for modified module: `pytest tests/path/to/test_module.py -xvs`
   - Check coverage didn't drop: `pytest --cov=src/module --cov-report=term-missing`
   - If coverage dropped: Add tests for uncovered lines

3. **Red flags indicating missing tests**:
   - "I'll add tests later..." → **STOP**: Add tests NOW
   - "The existing tests should cover this..." → **VERIFY**: Run tests and check coverage
   - "It's just a small change..." → Small changes cause bugs too - add tests
   - "Manual testing is enough..." → Manual tests don't prevent regression

4. **Minimum test requirements by change type**:
   - **New feature** (Phase 1-4): Tests for each phase (unit + integration)
   - **Bug fix**: Regression test that fails before fix, passes after
   - **Refactor**: Existing tests must still pass (no new tests needed if behavior unchanged)
   - **API/schema change**: Update mocks + verify all callers tested

**Example workflow** (AI-Enhanced Severity Classification):
- ✅ Phase 1: Add `importance` field → Added 3 unit tests for new classification logic
- ✅ Phase 2: Backfill AI integration → Added 3 integration tests (success, fallback, failure)
- ✅ Phase 3: Source name mapping → Updated 14 parametrized tests
- ⚠️ Phase 4: CLI filtering → Documented manual validation (CLI tests are complex)

**When tests are NOT needed**:
- Documentation-only changes (README, comments)
- Configuration changes (unless config parsing has logic)
- Build/CI scripts (unless they contain business logic)

**Enforcement**: Before marking task complete or moving to next phase, verify all tests pass and coverage is maintained.

---

## Core Principles

### 1. Avoid Workarounds at All Costs
When encountering issues, find root cause instead of adding fallbacks, complex parsing, or masks.

**Common violations**:
- Adding try/except to suppress errors
- Parsing "malformed" data with regex
- Adding fallback values for "missing" data
- Defensive validation for "untrusted" internal data

**Right approach**: Trace issue through pipeline → Fix at source

[Source: ARCHITECTURE.md #1] (#first:2025-10-07 #reinforced:2025-10-08,2025-10-21,2025-11-15)

---

### 2. Root Cause Investigation Over Symptom Fixing
If you need regex to parse JSON or complex "unescaping" logic, something upstream is broken. Fix the source, not the symptoms.

**Example**: AI returning malformed JSON → Don't build JSON parser → Fix: Prompt too long (20K chars hit 8K token limit) → Condense prompt

**Ask yourself**:
- WHY is this data malformed?
- WHERE in the pipeline does it get corrupted?
- CAN I fix the source instead?

[Source: ARCHITECTURE.md #2] (#first:2025-10-08 #reinforced:CLAUDE.md,2025-11-15)

---

### 3. Trust Validated Data
When data is already validated/extracted (by AI, APIs, libraries), don't add unnecessary formatting logic. Just display with proper UI treatment.

**Common violations**:
- Re-parsing API responses "just in case"
- Adding validation for library-validated data
- Complex formatting when data is already structured

**Right approach**: If AI/API/library validated it → Trust it → Display properly

[Source: ARCHITECTURE.md #4] (#first:CLAUDE.md)

---

### 4. Don't Over-Engineer
Avoid unnecessary utility functions, complex formatters when simple logic suffices. If it's structured data, use as-is.

**Examples**:
- ✅ Use system fonts (not custom fonts)
- ✅ Inline calculation (not extracted utility)
- ✅ Platform-native features (not custom implementation)

**Ask before abstracting**:
- Used in 3+ places? (If no, keep inline)
- Adds actual value? (Not "might be useful later")
- Simpler than inline? (Not "more flexible")

[Source: ARCHITECTURE.md #5] (#first:2025-10-12 #reinforced:CLAUDE.md)

---

### 5. User Questions Signal Wrong Direction
"Are we adding a fallback again???" indicates wrong approach. Pause and reconsider entire solution.

**Other warning signals**:
- "Isn't this a workaround?"
- "Why isn't this already structured?"
- "What can user do with this?"

**Response**: Stop → Re-read principles → Find root cause

[Source: ARCHITECTURE.md #3] (#first:2025-10-07)

---

### 6. Check Existing Patterns First
Grep for similar solved problems before implementing new solutions. Saves ~20 minutes of trial-and-error.

**Before writing code**:
1. Search codebase for similar features
2. Check how error handling is done elsewhere
3. Look for existing utilities/helpers

**Pattern**: `grep -r "similar_functionality" src/`

[Source: DEBUGGING.md #9] (#first:2025-10-09 #reinforced:2025-10-23)

---

### 7. "What Can User Do With This?" Eliminates Waste
If user can't act on information, don't build it.

**Example**: Fallback summaries when scraping fails → User: "What can I do with useless info?" → Removed fake fallbacks entirely

**Ask before implementing**:
- What action can user take with this?
- Does it solve their actual problem?
- Or am I just "handling the error"?

[Source: ARCHITECTURE.md #13] (#first:2025-11-13)

---

### 8. Scientific Calculation Over Guessing
Show your work. Batch size formula `(2048 / 50) * 0.8 = 32` is better than guessing 10, 15, 30.

**When sizing/tuning**:
- Calculate based on constraints (not guess)
- Document formula in comments
- Explain trade-offs

**Think like senior engineer**: Math → Document → Implement

[Source: ARCHITECTURE.md #14] (#first:2025-11-13)

---

### 9. Verify Before Declaring Success
Build passing ≠ functional success. Always verify actual behavior matches intent before marking complete.

**Verification checklist**:
- [ ] Actual behavior matches expected? (Not just "tests pass")
- [ ] Database state correct? (Not just "script said success")
- [ ] User confirmed problem solved? (Not just "looks good to me")

**Remember**: User skepticism catches what automated checks miss

[Source: TESTING.md #1, DEBUGGING.md #1-2] (#first:2025-10-20 #reinforced:2025-10-21,2025-10-23)

---

### 10. Read Component Before Testing/Modifying
Understanding actual behavior saves 20+ minutes vs trial-and-error. Reveals invalid assumptions.

**Before writing code/tests**:
1. Read the module you're modifying
2. Understand current behavior
3. Check what SHOULD happen
4. Then implement/test

**QA mindset**: Understand → Observe → Assert (not Guess → Fix → Hope)

[Source: TESTING.md #3] (#first:2025-10-15 #reinforced:2025-10-19)

---

### 11. Separation of Concerns
Minimize integration surface area = lower risk. Keep concerns separate (code, config, documentation).

**Examples**:
- Web scraping separate from AI processing
- Data fetching separate from formatting
- Configuration separate from code logic

**When touching an area**: Look for coupling to reduce

[Source: ARCHITECTURE.md #11] (#first:2025-10-23)

---

### 12. Frequency-Agnostic Naming
Avoid temporal assumptions in naming. "Daily" hardcodes frequency; "Run" works for hourly/daily/weekly.

**Bad**: `daily_report`, `hourly_sync`, `weekly_cleanup`
**Good**: `generate_report`, `sync_data`, `cleanup_old_records`

**Principle**: Name by WHAT it does, not WHEN it runs

[Source: ARCHITECTURE.md #15] (#first:2025-11-13)

---

### 13. `dict.get(key, default)` Does NOT Handle `None` Values — Use `or` Chain
`dict.get(key, default)` only falls back to `default` when the key is **absent**. When the key exists with value `None`, it returns `None`.

**Wrong pattern**:
```python
item.get("name", item.get("title", ""))  # Returns None if name=None (key exists!)
```

**Correct pattern**:
```python
item.get("name") or item.get("title") or ""  # Works for absent OR None
```

**When this matters**: APIs, scrapers, and external data sources often set fields to `None` explicitly rather than omitting the key. Both cases must be handled.

**Real example**: Blog RSS scrapers produced `{"name": None, "title": "Post Title"}`. The `.get("name", fallback)` pattern returned `None` instead of `"Post Title"`, silently storing empty strings in ChromaDB.

[#first:2026-02-23]

---

## Anti-Patterns (Quick Reference)

**If you're about to do ANY of these → STOP and read relevant principle above:**

- ❌ Adding fallback logic to mask root causes → Read #1, #2
- ❌ Complex parsing/formatting for data that should be structured → Read #2, #3
- ❌ Creating utility functions when simple inline logic works → Read #4
- ❌ Defensive coding reflex (sanitization instead of fixing source) → Read #1, #3
- ❌ Implementing features without verifying user value → Read #7
- ❌ try/except around errors without investigating source → Read #1, #2
- ❌ Regex to parse structured formats (JSON, XML) → Read #2
- ❌ Guessing constants/sizes without calculation → Read #8
- ❌ Marking complete without verification → Read #9

---

## Decision Tree (Use During Implementation)

```
┌─────────────────────────────────────────────┐
│ I'm about to add error handling / parsing   │
└────────────────┬────────────────────────────┘
                 ↓
         ┌───────────────┐
         │ WHY is this   │
         │ needed?       │
         └───┬───────────┘
             ↓
    ┌────────┴────────┐
    │ Data malformed  │ → Read #2: Trace upstream, fix source
    ├─────────────────┤
    │ Error occurring │ → Read #1: Find root cause, don't suppress
    ├─────────────────┤
    │ Validation needed│ → Read #3: Is data already validated?
    ├─────────────────┤
    │ User might enter │ → OK: Validate at system boundaries
    │ bad input       │
    └─────────────────┘

┌─────────────────────────────────────────────┐
│ I'm about to extract function / add utility │
└────────────────┬────────────────────────────┘
                 ↓
         ┌───────────────┐
         │ Used in 3+    │ → YES: OK to extract
         │ places?       │ → NO: Read #4, keep inline
         └───────────────┘

┌─────────────────────────────────────────────┐
│ Data seems wrong / needs complex processing │
└────────────────┬────────────────────────────┘
                 ↓
         ┌───────────────┐
         │ Use Root Cause│ → Trace to source
         │ Checklist     │ → Fix upstream
         └───────────────┘
```

---

## Related Topics

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Comprehensive architecture principles (15 total)
- **[DEBUGGING.md](DEBUGGING.md)**: Investigation strategies, verification discipline
- **[TESTING.md](TESTING.md)**: QA mindset, test development, verification
- **[PROCESS.md](PROCESS.md)**: User collaboration, planning, documentation

---

**Last Updated**: 2025-01-25 (created from extracted principles)
**Source Sessions**: 26+ retrospectives (2025-10-07 to 2025-11-23)
**Principles Count**: 12
**Purpose**: Prevent workarounds and over-engineering during implementation phase
