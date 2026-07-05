# CI/CD & Deployment Learnings

**Purpose**: Universal CI/CD principles for workflows, debugging, and deployment.

**Project-specific patterns**: See `docs/learnings/project/` for specific platform/tool configurations.

---

## Core Principles

### Local Verification First

1. **Test locally before pushing to CI** - Run commands with test flags to verify syntax. Could catch ALL errors before 3 push cycles.
   [Cross-cutting: DEBUGGING #13]
   (#first:2025-10-20)

2. **Local CI verification before workflow push** - Run local verification after modifying CI workflows to catch issues (scopes, config errors) locally. (#first:2025-10-16)

3. **Iterative debugging requires verification at each step** - Fix → Test locally → Verify → Push. Don't stack unverified fixes.
   [Cross-cutting: DEBUGGING #13]
   (#first:2025-10-20)

4. **MANDATORY: Run tests + lint before EVERY push to main** - No exceptions. Even "trivial" changes break CI. Commands MUST run before push:
   ```bash
   pytest --tb=short       # All tests must pass
   black --check src/ tests/  # Formatting must be clean
   ruff check src/ tests/     # Linting must pass
   mypy src/                  # Type checking must pass
   ```
   If ANY fail: fix locally, re-run ALL four commands, THEN push. Never push broken code to main.

   **Why this keeps failing**: Parallel sessions, time pressure, "it's just a small change" thinking.
   **Cost of skipping**: 5 min local verification vs 15+ min CI debugging + reputation damage.
   [Cross-cutting: TESTING #15, PROCESS #13]
   (#first:2025-11-16)

### CI Behavior & Debugging

4. **User skepticism catches hidden CI failures** - When user questions suspicious metrics (CI passing too fast), investigate deeply. Their intuition catches what automated checks miss.
   [Cross-cutting: PROCESS #1,4,8, TESTING #35, DEBUGGING #4]
   (#first:2025-10-20)

5. **CI timing anomalies indicate problems** - CI passing "too fast" or "too slow" should trigger investigation, not celebration. Check logs match intended strategy.
   [Cross-cutting: TESTING #1, DEBUGGING #1-2]
   (#first:2025-10-20)

6. **CI failures are quality enforcement mechanisms** - Don't bypass with `continue-on-error`. Let them fail to force fixing root issues. (#first:2025-10-16)

### CI Configuration

7. **CI cost optimization should be considered early** - Add path ignores for documentation/config files immediately to save 50-70% on those commits. (#first:2025-10-20)

8. **Standard platform configurations should be default** - Research platform-specific best practices (routing configs, build settings) proactively during deployment setup. (#first:2025-10-22)

9. **Flipping a git host repo from private to public exposes every commit on every branch/tag, not just the current default branch — and a history rewrite only helps if it reaches every branch, not just the one you rewrote** - Visibility is a permissions setting; it does not rewrite or filter history. Checked before a real flip: any stale-but-merged branches left over from a feature-branch workflow still point at the pre-rewrite commit graph even after the default branch is rewritten, so they'd silently re-expose whatever the rewrite removed unless separately deleted (they're usually safe to just delete outright if they carry zero commits not already in the default branch — check with `git rev-list --count <default>..<branch>` first). The only fully clean way to get a "fresh, history-free" public repo without touching the private one is to rename the original repo away and create a brand-new repo under the original name/URL — verify first whether anything (READMEs, hardcoded archive-link base URLs, canonical links) depends on that exact URL staying the same. (#first:2026-07-06)

---

## Anti-Patterns to Avoid

- ❌ Pushing CI workflow changes without local verification first
- ❌ Adding `continue-on-error` to bypass failing quality checks
- ❌ Celebrating CI "passing quickly" without checking what actually ran
- ❌ Stacking multiple fixes without verifying each one locally
- ❌ Forgetting path-ignore for documentation-only commits

---

## Reference Examples

### Example 1: CI Passing Too Fast (#2025-10-20)

**Situation**: Implemented cross-platform testing, CI passes in 5-6 minutes.

**User Question**: "Does it make sense that CI is passing in just 5 minutes? Is it really running what it needs to?"

**Investigation**: Revealed CI was still only running basic tests despite claiming full implementation.

**Root Cause**: Workflow file still had old configuration from workaround approach.

**Lesson**: User questioning suspicious metrics (timing) led to discovering claimed implementation didn't match reality.

---

### Example 2: Local Verification Saves Push Cycles

**Situation**: Multiple attempts to fix CI configuration.

**Mistake**: Pushed changes without local verification each time.

**Result**: 3 push cycles to find syntax error.

**Better Approach**: Test command locally with `--dry-run` or `--list` flags first.

**Lesson**: Could have caught ALL issues locally before any pushes.

---

### Example 3: CI Cost Optimization (#2025-10-20)

**User Question**: "Should we filter out docs/config files?"

**Insight**: Documentation commits shouldn't trigger expensive CI (50-70% savings possible).

**Implementation**:
```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - 'config/**'
```

**Result**: Skip CI for documentation changes, save operational costs.

**Lesson**: Cost-conscious development means avoiding unnecessary CI runs.

---

### Example 4: Local CI Verification (#2025-10-16)

**Situation**: First push failed because token lacked necessary scope for CI file.

**Could Have Avoided**: Running full local verification would have caught this earlier.

**Lesson**: Verify complete pipeline locally before pushing workflow changes.

---

## When to Apply These Principles

### Before Modifying CI Workflows
- ✓ Run local verification to test changes work
- ✓ Check if credentials/tokens have necessary scopes
- ✓ Test command syntax with dry-run/list flags
- ✓ Consider what paths should be ignored (docs, configs)

### When CI Fails
- ✓ Check timing - is it suspiciously fast or slow?
- ✓ Verify logs match intended strategy
- ✓ Fix root cause instead of adding continue-on-error
- ✓ Test the fix locally before pushing again

### When Setting Up New CI
- ✓ Add paths-ignore for documentation immediately
- ✓ Configure environment variables properly
- ✓ Set up local verification workflow
- ✓ Research platform-specific best practices

### Deployment Configuration
- ✓ Research platform-specific configs first
- ✓ Add standard configurations proactively
- ✓ Test deployment locally before pushing

---

## Related Topics

- **TESTING**: Test execution strategies, local vs CI testing
- **DEBUGGING**: Iterative troubleshooting, verification at each step
- **PROCESS**: Cost consciousness, parallel work strategies
- **ARCHITECTURE**: No workarounds (fix root causes, not CI bypasses)

---

**Last Updated**: 2026-07-06 (added #9 — visibility flips expose all branches/tags, not just the default branch)
**Sessions Covered**: 18+ retrospectives (2025-10-07 to 2026-07-06)
**Principles Count**: 9
