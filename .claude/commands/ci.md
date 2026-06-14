Run the full CI pipeline locally (simulates GitHub Actions):

1. **Lint**: `npm run lint`
   - Report any linting errors
2. **Unit Tests**: `npm run test:ci`
   - Report test results (unit tests only)
3. **I18n Check**: `npm run i18n:check`
   - Verify translation completeness
4. **Build**: `npm run build`
   - Verify successful compilation
5. **E2E Tests**: `npm run test:e2e`
   - Run Playwright end-to-end tests
   - Report test results (pass/fail counts)
   - If tests fail, mention: "Check playwright-report/ for details"
6. **Summary**:
   - List all passed/failed steps
   - Overall CI status: ✅ PASS or ❌ FAIL
   - Time taken for full pipeline
   - Total test count (unit + E2E)

Note: This matches the GitHub Actions CI workflow exactly.
