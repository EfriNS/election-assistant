# Pre-Deployment Checklist

You are assisting with a deployment. Follow this checklist systematically.

## Context Review

First, review the current session:
- What components/functions were changed?
- What files were modified?
- Was this a bug fix or new feature?

## Step 1: Test Verification

**Identify what to test:**
- Frontend component changes → `npm run test:run -- ComponentName`
- Edge function changes → `npm run test:edge` (if Deno available)
- Multiple changes → run all relevant test commands

**Execute tests and report results:**
```bash
# Example for frontend component
npm run test:run -- JobMatchingModal
```

**Interpret results:**
- ✅ All tests pass → Proceed to Step 2
- ❌ Any tests fail → STOP, report failures to user, ask if they want to:
  - Fix the code
  - Fix the test (if test is wrong)
  - Investigate why it failed

**DO NOT PROCEED if tests are failing without user approval.**

## Step 2: Regression Test Check

Ask yourself these questions:

1. **Did we fix a bug this session?**
   - YES → Continue to question 2
   - NO → Skip to Step 3

2. **Could this bug happen again?** (Consider: edge cases, specific inputs, silent failures)
   - YES → Continue to question 3
   - NO → Skip to Step 3

3. **Would a test be valuable?** (Consider: effort < 15 min, prevents hours of debugging)
   - YES → Propose specific regression test to user
   - NO → Explain why skipping (e.g., "one-off environment issue")

**If proposing a regression test:**
- Describe what the test would verify
- Estimate effort (e.g., "~10 minutes to add")
- Explain value (e.g., "prevents JSON parsing errors with 2000+ char inputs")
- Ask: "Should I add this regression test?"

## Step 3: Deployment Readiness Report

Provide a clear status report:

```
✅ Pre-Deployment Checklist Complete

Tests Run:
- npm run test:run -- JobMatchingModal: ✅ 27 passing

Regression Test:
- Added: [YES/NO]
- Reason: [why added or why skipped]

Changes Ready to Deploy:
- [List files/components changed]

Recommended Deployment Commands:
- npx supabase functions deploy ai-job-analysis
- (Frontend already built)

Manual Testing Recommendation:
- [Suggest what user should test manually after deploy]
```

## Step 4: Deployment Guidance

**If user approves deployment:**

1. **Edge functions**: Guide through `npx supabase functions deploy [name]`
2. **Frontend**: Remind that build is already complete (if applicable)
3. **Database migrations**: Check if any migrations need to run
4. **Manual testing**: Recommend critical user flows to verify

**Post-deployment:**
- Suggest what to test manually
- Remind about monitoring (error logs, user feedback)

---

## Important Notes

- **NEVER skip testing** - Even if changes seem trivial
- **Trust but verify** - Tests pass ≠ feature works (but it's required)
- **User has final say** - If user wants to deploy without tests, note the risk but proceed
- **Be realistic** - Balance quality with velocity (see CLAUDE.md for guidance)

## Learning References

Consult these before making recommendations:
- `CLAUDE.md` - Testing & Deployment Workflow section
- `docs/learnings/TESTING.md` - 47 principles from 25+ sessions
- Specifically: "When to Add Regression Tests" (CLAUDE.md line 78-95)
