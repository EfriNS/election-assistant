# Architecture & Design Learnings

**Purpose**: Universal architecture principles for simplicity, root cause fixes, and design decisions.

---

## Core Principles

### No Workarounds Philosophy

1. **Avoid workarounds at all costs** - When encountering issues, find root cause instead of adding fallbacks, complex parsing, or masks. User's "no workarounds" philosophy catches problems faster.
   [Cross-cutting: DEBUGGING #3, AI-PROMPTS #3]
   (#first:2025-10-07 #reinforced:2025-10-08,2025-10-21,2025-11-15)

2. **Root cause investigation over symptom fixing** - If you need regex to parse JSON or complex "unescaping" logic, something upstream is broken. Fix the source, not the symptoms. Added mandatory checklist to CLAUDE.md after test tolerance violation.
   [Cross-cutting: DEBUGGING #3, AI-PROMPTS #3]
   (#first:2025-10-08 #reinforced:CLAUDE.md,2025-11-15)

3. **User questions signal direction changes** - "Are we adding a fallback again???" indicates wrong approach. Pause and reconsider entire solution.
   [Cross-cutting: PROCESS #8]
   (#first:2025-10-07)

### Simplicity & Trust

4. **Trust validated data** - When data is already validated/extracted (by AI, APIs, libraries), don't add unnecessary formatting logic. Just display with proper UI treatment. (#first:CLAUDE.md)

5. **Don't over-engineer** - Avoid unnecessary utility functions, complex formatters when simple logic suffices. If it's structured data, use as-is. (#first:2025-10-12 #reinforced:CLAUDE.md)

6. **Check architectural principles before proposing solutions** - Review project guidelines at decision points to prevent over-engineering (e.g., system fonts vs custom fonts saved 2-3 hours). (#first:2025-10-12)

### Design Decisions

7. **Alternative approaches can be more elegant** - "Consent through use" + clear disclosure better UX than mandatory checkboxes while maintaining compliance. Question assumptions about "required" patterns. (#first:2025-10-10)

8. **Separation of concerns applies to documentation** - Summary files should stay summaries. When docs exceed ~500 lines, split to summary + details (81% reduction possible). (#first:2025-10-15)

9. **Comprehensive fixes compound value** - When touching an area, look for related improvements. Takes longer but delivers higher quality. (#first:2025-10-07)

10. **Standard platform configurations should be default** - Create platform-specific configs proactively during deployment setup. Research platform best practices first. (#first:2025-10-22)

11. **Component isolation prevents regression** - Minimize integration surface area = lower risk. Separate concerns to reduce coupling. (#first:2025-10-23)

12. **User journey thinking reveals architectural concerns** - When user says "Scraping and AI are separate concerns with different failure modes," it exposes coupling. Think through complete user journey before implementation. (#first:2025-11-13)

13. **"What can user do with this?" eliminates waste** - User asking "What as a user can I do with this useless info?" about fallback summaries led to removing fake fallbacks entirely. If user can't act on it, don't build it. (#first:2025-11-13)

14. **Scientific calculation over guessing** - User: "Can you think like a senior engineer?" Batch size formula (2048 / 50) * 0.8 = 32 is better than guessing 10, 15, 30. Show your work. (#first:2025-11-13)

15. **Frequency-agnostic naming prevents future breaking changes** - "Daily" hardcodes frequency; "Run" works for hourly/daily/weekly. Avoid temporal assumptions in naming. (#first:2025-11-13)

16. **Backend cost structure fundamentally affects business model decisions** - Cost distribution (user-initiated vs background processing) determines viable pricing models. A background-processing feature can silently dominate cost even when user-facing usage looks light — "just 10 queries" ignores scheduled/automated calls happening behind the scenes. Lesson: Map complete cost structure BEFORE proposing business models. User-query subsidies ≠ background-processing subsidies.
   [Cross-cutting: PROCESS #strategic-planning]
   (#first:2025-11-30)

17. **Don't statically hardcode a constraint a dynamic mechanism already enforces** - When a system has both a static structure (config, priority list, schema) and an adaptive component with full context (an LLM prompt, a runtime check), resist encoding the same constraint in both. First-draft design hardcoded a low priority for a data bucket because it was "too close to" another static rule — but an explicit dynamic instruction handling that exact concern per-turn, with full runtime context, was being added anyway. User correction: the static demotion was redundant AND worse, since it discarded a genuinely high-value item based on a category the dynamic mechanism already judges case-by-case. Rule: order/prioritize static structures by their own objective merit; let the context-aware mechanism own constraints that require situational judgment. Don't pre-empt it with a static workaround for the same concern - pick one owner. (#first:2026-07-02)

18. **A retry is not automatically a "workaround" — it's legitimate resilience if the failure is confirmed external and non-deterministic, and the retry gets a fresh honest attempt rather than salvaging the bad one** - After a production JSON-parse failure, the instinct-avoiding-workarounds reflex would flag "just retry" as the same class of bad idea as "regex-extract the JSON blob" (a real, previously-rejected pattern in this exact codebase). The distinguishing test: (a) is the failure confirmed to originate outside your own code (verified via direct reproduction: 8 real calls with the exact failing context, 0 failures, ruling out a config/logic bug on our side) and (b) does the fix re-request a clean result rather than parse/patch the broken one (a fresh API call with the same request, vs. a regex fixing the malformed JSON string in place)? A retry satisfying both is resilience against confirmed upstream flakiness; "parse around it" is masking a bug whose actual source was never verified. Root-cause discipline means verifying *whose* fault it is before choosing symptom-fix vs. resilience-pattern, not reflexively banning anything that looks defensive. (#first:2026-07-05)

19. **A type annotation on parsed request JSON is a claim, not a runtime guarantee — an escaping/sanitization helper that only covers string fields leaves any other-typed field as an unchecked hole once that assumption breaks** - A field declared `number` in a request-body type still arrives as whatever the client actually sent; nothing at runtime stops a string from being interpolated wherever code trusted the type annotation. Concretely: an HTML-escape helper was applied consistently to every string field in a template builder, but a `number`-typed score field was interpolated raw on the assumption a number "can't contain markup" — except the payload was untrusted client JSON with no runtime shape check, so a client could send a string there instead. When auditing an escaping helper's coverage, check what it does *not* wrap, not just that it exists — fields whose type "shouldn't" need escaping are exactly the ones an untrusted-JSON boundary can violate. Reinforces "validate at system boundaries," but this specific failure mode (type-based exemption from escaping) is easy to miss because the review question is usually "does this field get escaped," not "does every field of every type get escaped or validated." (#first:2026-07-06)

---

## Anti-Patterns to Avoid

- ❌ Adding fallback logic to mask root causes
- ❌ Complex parsing/formatting for data that should already be structured
- ❌ Creating utility functions when simple inline logic works
- ❌ Over-engineering solutions without checking if simpler options exist
- ❌ Defensive coding reflex (sanitization instead of fixing source)
- ❌ Implementing features without verifying they add user value
- ❌ Custom solutions when platform-native options available

---

## Reference Examples

### Example 1: No Fallbacks Philosophy (#2025-10-07)

**Situation**: Data showing incomplete, tempted to add loading state fallback.

**User Reaction**: "Are we adding a fallback again???"

**Investigation**: Root cause was missing dependency in reactive hook - not re-running when data changed.

**Fix**: Added proper dependency array instead of fallback logic.

**Lesson**: User catches when we're reaching for workarounds instead of fixing root issues.

### Example 2: JSON Parsing Complexity (#2025-10-08)

**Problem**: AI returning malformed JSON requiring complex regex parsing and "unescaping" logic.

**Initial Approach**: Build robust JSON parser with multiple fallbacks.

**User Feedback**: "If we need regex to parse JSON, something's broken upstream."

**Root Cause**: Prompt grew to 20K characters → hit 8K token limit → truncated instructions.

**Fix**: Reduced prompt size (condensed examples), AI returned clean JSON again.

**Lesson**: Complex parsing logic is symptom of broken pipeline. Fix source, not symptom.

### Example 3: System Fonts vs Custom Fonts (#2025-10-12)

**Proposal**: Embed custom fonts for perfect typography.

**Architectural Check**: "Don't over-engineer" + "Always prioritize simplicity"

**Decision**: Use system fonts - renders perfectly, zero load time, no licensing complexity.

**Saved**: 2-3 hours implementation + ongoing maintenance burden.

**Lesson**: Review architectural principles before proposing "nice-to-have" features. Standard solutions often sufficient.

### Example 4: Documentation Organization (#2025-10-15)

**Problem**: File grew to 1,244 lines, hard to navigate, difficult git diffs.

**Solution**: Extract details to separate directory, keep 1-2 line summaries in main file.

**Result**: 1,244 → 240 lines (81% reduction) while preserving all content.

**Pattern**: Summary + Details separation
- Summary file: Quick navigation, high-level view
- Detail files: Comprehensive specs when needed

**Lesson**: Separation of concerns applies beyond code - documentation benefits from same principles.

### Example 5: Test Tolerance Workaround (#2025-11-15)

**Problem**: GitHub CI test failing with `assert 1.0000001192093038 <= 1.0`

**Initial Fix**: Changed test assertion to `<= 1.001` (added tolerance)

**User Question**: "Isn't it a workaround? Can the library return values >1.0, or is it a bug?"

**Investigation**:
- Traced value back to the similarity formula in source: `similarity = 1.0 / (1.0 + distance)`
- Formula cannot produce >1.0... unless `distance < 0`
- The underlying library returns tiny negative distances (e.g., `-1e-7`) due to floating-point precision
- Formula then produces `1.000000119...`

**Proper Fix**:
- Added clamping in application code: `similarity = min(1.0, max(0.0, raw_similarity))`
- Reverted test to strict `<= 1.0` assertion
- Application now guarantees valid similarity range

**Root Cause**: Pattern-matching ("floating-point = add tolerance") instead of critical thinking ("WHERE does this value come from?")

**Prevention**: Added mandatory 4-step checklist to CLAUDE.md for ALL test failures/errors.

**Lesson**: Principles existed but weren't actionable enough. Need decision trees/checklists to enforce critical thinking, not just reminders.

---

## When to Apply These Principles

### Before Adding Complexity
- ✓ Ask: "Am I fixing root cause or adding workaround?"
- ✓ Check if simpler solution exists (platform features, standard patterns)
- ✓ Review project architectural guidelines
- ✓ Verify feature adds actual user value

### When Encountering Data Issues
- ✓ Trace issue through pipeline (services → processing → display)
- ✓ Fix at source, not with defensive parsing
- ✓ Trust validated data - don't re-validate unnecessarily
- ✓ Use UI treatment (icons, styling) over complex formatting

### During Design Decisions
- ✓ Research platform-native solutions first
- ✓ Consider alternative patterns (consent through use vs explicit opt-in)
- ✓ Look for comprehensive fixes when touching an area
- ✓ Document rejected alternatives with rationale

### Code Organization
- ✓ Split large files when navigation becomes difficult (~500 lines)
- ✓ Use summary + details pattern for documentation
- ✓ Maintain separation of concerns across all artifacts

---

## Related Topics

- **DEBUGGING**: Root cause investigation, tracing issues through pipeline
- **PROCESS**: Check guidelines before decisions, document alternatives
- **AI-PROMPTS**: Token budgets affecting data quality, condensed examples
- **TESTING**: Test gaps revealing architecture quality issues

---

**Last Updated**: 2026-07-06 (added #19 — type annotations on parsed request JSON aren't a runtime guarantee, found via a pre-open-source security audit)
**Sessions Covered**: 18+ retrospectives (2025-10-07 to 2026-07-06)
**Principles Count**: 19
