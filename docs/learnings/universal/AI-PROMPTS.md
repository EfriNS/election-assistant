# AI Prompts & LLM Integration Learnings

**Purpose**: Universal AI/LLM integration principles for token budgets, prompt design, validation, and testing.

---

## Core Principles

### Token Budget & Prompt Design

1. **Token budget awareness for AI prompts** - Check prompt size and token limits BEFORE adding content. Prompt growing too large → AI hits limit → truncated output. (#first:2025-10-08)

1b. **Non-English output needs ~2× more tokens** - Hebrew, Arabic, CJK, and other non-Latin scripts tokenize less efficiently than English (~1 token per 1.5 chars vs. ~1 per 4 chars for ASCII). A 1400-char Hebrew response needs 700–900 output tokens; the same length in English would need ~350. Set `maxOutputTokens` generously when the model's output language is not English — a limit that works for English will routinely truncate Hebrew/Arabic. Truncated AI response → JSON.parse failure, not a graceful error. (#first:2026-06-26)

2. **Condensed examples maintain quality while saving tokens** - Reduce verbose examples to condensed format. Pattern-based examples > exhaustive repetition. (#first:2025-10-08)

3. **Revert unnecessary AI prompt complexity** - Don't over-engineer solutions to problems caused by other changes. If "we used to get perfect output before," revert to original format that worked.
   [Cross-cutting: ARCHITECTURE #1-2, DEBUGGING #3]
   (#first:2025-10-08)

### Validation & Testing

4. **Production data validation reveals AI behavior** - Queries on production AI outputs show exact behavior (patterns, anomalies) better than theory.
   [Cross-cutting: DEBUGGING #6]
   (#first:2025-10-08)

5. **Iterative testing reveals multi-layer AI issues** - Fix one issue → find next → fix that → find another. Expect 2-3 deploy→test→fix cycles for AI features.
   [Cross-cutting: DEBUGGING #8, PROCESS #14]
   (#first:2025-10-08)

6. **"Show me the data" for AI debugging** - Start with queries on production AI outputs. Concrete evidence drives targeted fixes vs guessing at problems.
   [Cross-cutting: DEBUGGING #6, TESTING #32]
   (#first:2025-10-08)

---

## Anti-Patterns to Avoid

- ❌ Adding prompt content without checking token limits
- ❌ Using verbose repetitive examples instead of condensed patterns
- ❌ Theorizing about AI behavior instead of querying production data
- ❌ Over-engineering prompt complexity to solve self-created problems
- ❌ Expecting AI to work perfectly after first attempt (plan for 2-3 iterations)
- ❌ Defensive parsing for AI output instead of fixing prompt issues

---

## Reference Examples

### Example 1: Token Limit Causes Output Issues (#2025-10-08)

**Problem**: AI returning malformed output requiring complex parsing.

**Initial Approach**: Build robust parser with multiple fallbacks and "unescaping" logic.

**User Feedback**: "If we need complex parsing, something's broken upstream."

**Investigation**: AI prompt grew to 20K characters over time as examples added.

**Root Cause**: AI hit 8K token output limit → truncated mid-response → malformed output.

**Fix**: Reduced prompt size:
- Condensed 50 lines of verbose examples → 15 lines pattern-based
- Removed redundant instructions
- Result: Prompt 12K chars, AI returns clean output again

**Lesson**: Check prompt size and token limits BEFORE adding content. Complex parsing = symptom of broken prompt.

---

### Example 2: Condensed Examples Pattern (#2025-10-08)

**Before (Verbose - 50 lines)**:
```
Example 1: If the input says "X"
You should output: "Y"

Example 2: If the input says "A"
You should output: "B"

Example 3: If the input says "M"
You should output: "N"

... [47 more lines]
```

**After (Condensed - 15 lines)**:
```
Examples (input → output):
- "X" → "Y"
- "A" → "B"
- "M" → "N"
- "P" → "Q"
- [5 more concise examples]

Pattern: [Description of transformation pattern]
```

**Result**: Same quality output, 70% token reduction.

**Lesson**: Pattern-based examples > exhaustive repetition. AI learns from patterns, not verbosity.

---

### Example 3: Production Data Reveals AI Behavior (#2025-10-08)

**Theory**: "AI should be returning perfect output with improvements."

**Reality Check**: Run query on production data.

**Discovery**:
- 40% of outputs = minimal changes
- 15% = exact duplicates
- Multiple entries with issues that should be unique

**Lesson**: Don't guess at AI behavior. Query production data to see actual patterns, then fix targeted issues.

---

### Example 4: Iterative AI Debugging (#2025-10-08)

**Iteration 1**: Fix issue A
- Deploy → Test → Find issue B

**Iteration 2**: Fix issue B
- Deploy → Test → Find issue C

**Iteration 3**: Fix issue C
- Deploy → Test → Find token truncation

**Iteration 4**: Reduce token usage
- Deploy → Test → Clean output, proper formatting ✓

**Lesson**: Expect 2-3 deploy→test→fix cycles for AI features. Each fix reveals next layer of issues.

---

### Example 5: Reverting Unnecessary Complexity (#2025-10-08)

**History**: AI used to return perfect output with simple 2K character prompt.

**Changes**: Added more examples, edge cases, formatting rules → 20K character prompt.

**Result**: AI started returning malformed output requiring complex parsing.

**Fix**: Reverted to original simple prompt format (with token-efficient examples).

**Outcome**: AI returns clean output again, no defensive parsing needed.

**Lesson**: Don't over-engineer prompts. If original simple version worked, revert to it instead of adding workarounds.

---

## When to Apply These Principles

### Before Modifying Prompts
- ✓ Check current prompt token count
- ✓ Calculate impact of adding examples/instructions
- ✓ Use condensed pattern-based examples, not verbose repetition
- ✓ Consider if addition actually improves AI output

### Testing AI Features
- ✓ Run queries on production AI outputs to see actual behavior
- ✓ Look for patterns (duplicate handling, formatting issues, edge cases)
- ✓ Plan for 2-3 deploy→test→fix iterations
- ✓ Test with variety of real-world inputs, not just ideal cases

### When AI Output Seems Wrong
- ✓ Query production data first - don't theorize
- ✓ Check if prompt hit token limits (truncation)
- ✓ Look for pattern in failures (40% minimal, 15% duplicates)
- ✓ Fix prompt issues instead of adding defensive parsing

### Debugging AI Issues
- ✓ Check token limits before assuming AI logic problems
- ✓ Review prompt complexity - can it be simplified?
- ✓ Expect multi-layer issues (fix one, find next)
- ✓ Consider reverting to simpler version that worked before

---

## Related Topics

- **ARCHITECTURE**: Root cause investigation (fix prompts, not parsing), no workarounds
- **DEBUGGING**: Production data first, systematic investigation, iterative fixing
- **TESTING**: Test coverage for AI services reveals architecture issues
- **PROCESS**: Iterative approach, expect multiple cycles for AI features

---

**Last Updated**: 2025-01-07 (universal principles extracted)
**Sessions Covered**: 18 retrospectives (2025-10-07 to 2025-10-23)
**Principles Count**: 6
