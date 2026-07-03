# Pre-Deployment Checklist

You are assisting with a deployment. Follow this checklist systematically.

## Context Review

First, review the current session:
- What components/routes were changed?
- What files were modified?
- Was this a bug fix or new feature?

## Step 1: Test Verification

**Run the full suite (this app doesn't have separate per-component test commands):**
```bash
npm test           # vitest
npx tsc --noEmit   # type check
npm run lint       # eslint
```

**Interpret results:**
- ✅ All pass → Proceed to Step 2
- ❌ Any fail → STOP, report failures to user, ask if they want to:
  - Fix the code
  - Fix the test (if test is wrong)
  - Investigate why it failed

**DO NOT PROCEED if checks are failing without user approval.**

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
- Explain value (e.g., "prevents malformed JSON from an unconstrained Gemini call")
- Ask: "Should I add this regression test?"

## Step 3: Deployment Readiness Report

Provide a clear status report:

```
✅ Pre-Deployment Checklist Complete

Checks Run:
- vitest: ✅ N passing
- tsc --noEmit: ✅
- eslint: ✅

Regression Test:
- Added: [YES/NO]
- Reason: [why added or why skipped]

Changes Ready to Deploy:
- [List files/routes changed]

Manual Testing Recommendation:
- [Suggest what user should click through manually after deploy — e.g. the quiz flow for the changed topic]
```

## Step 4: Deployment Guidance

This app deploys on Vercel via **git push** — there is no manual deploy command to run.

**If user approves deployment:**
1. Confirm the branch: pushing a feature branch creates a **preview** deployment; pushing/merging to `main` deploys to **production**.
2. Never run `vercel deploy` manually — GitHub push is the only trigger (see `feedback_vercel_deploy` in memory / the `vercel:deploy` skill if a manual deploy is genuinely needed).
3. If new environment variables were introduced, confirm they're set in the Vercel project settings (not just `.env.local`) before pushing to main.

**Post-deployment:**
- Suggest what to test manually on the live preview/production URL
- Remind about monitoring: Langfuse traces for AI routes, `QUOTA_SLACK_WEBHOOK_URL`/`FEEDBACK_SLACK_WEBHOOK_URL` alerts, Mixpanel funnel

---

## Important Notes

- **NEVER skip testing** - Even if changes seem trivial
- **Trust but verify** - Tests pass ≠ feature works (but it's required)
- **User has final say** - If user wants to deploy without tests, note the risk but proceed
- **Be realistic** - Balance quality with velocity (see CLAUDE.md for guidance)

## Learning References

Consult these before making recommendations:
- `CLAUDE.md` - Testing & Deployment Workflow section
- `docs/learnings/universal/TESTING.md` - testing principles
- `docs/learnings/project/VAA-DESIGN.md` - project-specific patterns (grounding data, scoring, AI routes)
