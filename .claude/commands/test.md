Run the unit test suite and report results:

1. Run unit tests: `npm test` (or `npx vitest run` for a single file: `npx vitest run tests/<file>.test.ts`)
2. Check test results and report:
   - Total tests run
   - Pass count and percentage
   - Any failures (if present)
   - Test duration
3. Provide summary: "✅ All N tests passing (100%)" or detailed failure info

Note: There is no automated E2E suite in this repo — verify user-facing changes manually with the dev server (`npm run dev`) and a browser.
