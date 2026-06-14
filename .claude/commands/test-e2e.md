---
description: "Run E2E tests to verify user workflows"
---

Run Playwright E2E tests for the CV Refinery application:

## Quick Test (Recommended)
Run the main complete workflow test only (fastest, covers critical paths):
```bash
npm run test:e2e -- e2e/cv-complete-workflow.spec.ts
```

Report results:
- Number of tests passed/failed
- Time taken
- If failed: Mention "Check test-results/ for screenshots and error context"

## Full E2E Suite
Run all E2E tests (complete workflow, error scenarios, progressive disclosure):
```bash
npm run test:e2e
```

Report results:
- Tests passed/failed by file
- Total time
- If failed: Mention specific failures and where to find reports

## Available E2E Test Files
1. **cv-complete-workflow.spec.ts** (critical path)
   - Complete user journey: Register → Upload → Analyze → Match → Refine
   - Multi-CV management and comparison

2. **error-scenarios.spec.ts** (error handling)
   - Invalid file uploads
   - Network errors
   - API failures

3. **user-states-progressive-disclosure.spec.ts** (UI states)
   - Progressive feature unlocking
   - Empty states
   - Onboarding flow

## Debugging Failed Tests
If tests fail, suggest:
1. Check screenshots in `test-results/`
2. Check error context markdown files
3. Run with UI mode for investigation: `npm run test:e2e:ui`
4. Run with debug mode: `npm run test:e2e:debug`

## Note
E2E tests require valid Supabase credentials in `.env` for authentication testing.
