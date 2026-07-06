---
model: haiku
description: "Run the full local verification pipeline (tests + tsc + eslint + build)"
---

Run the full local verification pipeline (there is no GitHub Actions workflow in this repo — this simulates the mandatory pre-push checklist from CLAUDE.md):

1. **Lint**: `npm run lint`
   - Report any linting errors
2. **Type check**: `npx tsc --noEmit`
   - Report any TypeScript errors
3. **Unit Tests**: `npm test`
   - Report test results (pass/fail counts, duration)
4. **Build**: `npm run build`
   - Verify successful compilation
5. **Summary**:
   - List all passed/failed steps
   - Overall status: ✅ PASS or ❌ FAIL
   - Time taken for full pipeline

Note: there is no automated E2E suite in this repo — for user-facing changes, verify manually with `npm run dev` and a browser (see `/test-e2e`).
