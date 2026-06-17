# Debugging & Troubleshooting Learnings

**Purpose**: Universal debugging principles for verification, systematic investigation, and persistence.

---

## Core Principles

### Verification Discipline

1. **Script success ≠ actual success** - "456 users deleted" message ≠ database actually cleaned. Always verify actual state, not just output messages. "Completed successfully" ≠ "changes detected" - always clarify what success means.
   [Cross-cutting: TESTING #1, CI-CD #5]
   (#first:2025-10-21 #reinforced:2025-12-28)

2. **User verification required for data operations** - NEVER mark operations complete without: (1) verifying actual state, (2) user confirmation problem solved, (3) testing expected side effects explicitly.
   [Cross-cutting: TESTING #1]
   (#first:2025-10-21)

3. **Analysis before modification** - Understand data relationships before deleting/modifying. Prevents incorrect logic.
   [Cross-cutting: ARCHITECTURE #2]
   (#first:2025-10-21)

4. **Verify external identifiers before embedding** - Never assume GitHub usernames, repo names, or API endpoints. Always verify with authoritative source (gh repo view, API docs) before embedding in code/config.
   [Cross-cutting: CI-CD #7]
   (#first:2025-12-01)

5. **Verify volume state before destructive cleanup** - Docker volumes persist container shutdowns. Never assume volume is empty/gone because container stopped. Always check volume size/contents (`docker run --rm -v <volume>:/data alpine du -sh /data`) BEFORE running `down -v` or volume deletion.
   [Cross-cutting: TESTING #35]
   (#first:2025-12-07)

   **Session 2025-12-07**: Daily E2E test - Assumed test volume was gone because container wasn't running. Ran `docker-compose -p contendre-test down -v` without checking volume contents. Lost baseline data (1,551 items collected 2025-12-06). Should have verified volume size (20K empty vs 20M-100M with data) before cleanup.

### Systematic Investigation

6. **Initial misdiagnosis acceptable if course-corrected quickly** - Being wrong initially is fine. Accept feedback (logs, timing, user input) and pivot quickly. Saves time vs defending incorrect theory.
   [Cross-cutting: PROCESS #1,4,8, TESTING #35]
   (#first:2025-10-19 #reinforced:2025-12-05)

   **Session 2025-12-05**: Initially concluded Docker image was old based on git log, but user immediately corrected with container timestamp evidence. Quickly verified with docker inspect and pivoted. Prevented wasted time defending wrong theory.

7. **"Works manually" + "fails in test" = timeout/environment issue** - When user says "works manually in X seconds" but test fails, immediately check timeout settings and completion conditions. (#first:2025-10-19)

8. **Read error context before diagnosing root cause** - Check error context files and screenshots showing actual state before assuming issues. Saves ~30 minutes of wrong-direction debugging.
   [Cross-cutting: TESTING #32, AI-PROMPTS #4,6]
   (#first:2025-10-19)

9. **Check timeouts before diagnosing backend** - "Hangs" often = timeout issue, not backend problems. Should be first check for stuck operations. (#first:2025-10-19)

### Persistence & Patterns

10. **Persistence in systematic debugging** - Don't give up after 3-4 attempts. Complex issues may need 8+ systematic tries.
   [Cross-cutting: AI-PROMPTS #5, PROCESS #14]
   (#first:2025-10-09)

11. **Check existing codebase patterns first** - Grep for similar solved problems before trying 8 different solutions. Saves ~20 minutes.
   [Cross-cutting: TESTING #3]
   (#first:2025-10-09 #reinforced:2025-10-23)

12. **Framework-specific issues → check docs immediately** - For framework/library issues, reference official docs early vs 20 minutes of trial-and-error. (#first:2025-10-07)

13. **Use specialized agents for systematic error analysis** - Specialized debugging agents excel at parallel analysis with clear fix recommendations. Saves ~15 minutes vs manual sequential debugging. (#first:2025-10-16)

14. **Compare working vs broken state first** - When something that worked suddenly breaks, compare known-working version immediately. Don't spend days guessing - diff reveals exact changes. (#first:2025-10-25)

15. **Iterate locally before remote debugging** - 40s local vs 40min remote = 60x faster feedback. Set up local reproduction first, fix there, then validate remotely. Remote is for confirmation, not debugging.
   [Cross-cutting: CI-CD #1,3]
   (#first:2025-10-25)

16. **Timeouts ≠ feature failures** - When operations timeout with error messages, investigate infrastructure slowness (cold start, network, delays) before assuming application bugs. Check service logs with timestamps. (#first:2025-10-30)

17. **Verify enum values from API documentation** - Don't assume enum meanings (e.g., finish_reason=2). Read official docs to verify actual values. Wrong enum mapping can misdiagnose all failures (e.g., MAX_TOKENS as SAFETY).
   [Cross-cutting: TESTING #4]
   (#first:2025-11-16)

18. **Integration testing reveals what unit tests miss** - Unit tests with mocks pass but real API calls fail (token overflow, rate limits, verbosity). Run integration tests with real APIs to catch production issues.
   [Cross-cutting: TESTING #35]
   (#first:2025-11-16 #reinforced:2025-11-28)

   **Session 2025-11-28**: Gemini reliability investigation - Only real backfill runs revealed 8% failure rate (Pydantic validation errors). Mock tests passed perfectly but production showed intermittent failures requiring 10-iteration test.

19. **Design discussion before implementing non-trivial bug fixes** - For bugs beyond simple fixes, STOP and present design options (A/B/C) with pros/cons before implementing. User demanding "take a BIG STEP BACK" signals you're moving too fast. Present options, get user input, THEN implement.
   [Cross-cutting: PROCESS #21, ARCHITECTURE #1]
   (#first:2025-12-05)

   **Session 2025-12-05**: CUSTOM_COMPETITORS bug - Almost implemented fix immediately. User stopped me: "I need you to take A BIG STEP BACK and come with a proper design... PLEASE, LET'S PLAN BEFORE ACTING!!!" Presented 3 options (track removed, one-time only, merge new), user chose Option A. Prevented hasty implementation.

20. **User clarifying questions often expose root cause** - When user asks "can you explain?" about suspicious behavior, don't just explain symptoms - investigate actual data to find root cause. User question signals something doesn't make sense.
   [Cross-cutting: PROCESS #1,4, ARCHITECTURE #2]
   (#first:2025-12-30)

   **Session 2025-12-30**: User tested get_launch_details and observed all 3 snapshots classified as "new". I initially explained "no prior snapshot to compare" without investigating. User asked: "You said there are 3 snapshots... so why aren't the 2nd and 3rd ones 'changes'?" This forced me to inspect actual ChromaDB data, revealing all items had `similarity_score=None`. Root cause: backfill bypassed change detection entirely. User's question led directly to the fix.

---

## Anti-Patterns to Avoid

- ❌ Trusting output messages without state verification
- ❌ Defending initial diagnosis when feedback suggests otherwise
- ❌ Assuming issues before checking configuration
- ❌ Trying novel solutions before checking existing patterns
- ❌ Giving up after 3-4 failed attempts on complex issues
- ❌ Skipping error context files (screenshots, logs, snapshots)
- ❌ Sequential debugging when tools can parallelize analysis
- ❌ Assuming Docker volumes are gone when containers stop (volumes persist - verify before cleanup)

---

## Reference Examples

### Example 1: Script Success ≠ Actual Success (#2025-10-21)

**Situation**: Cleanup script reported "Successfully deleted 456 records"

**Marked Complete**: Task marked done based on script output.

**User Feedback**: "Database still has lots of garbage"

**Investigation**: Found 194 orphaned records in related tables.

**Root Cause**: Didn't call proper deletion function - CASCADE logic never executed.

**Final Cleanup**: 720+ total records (456 direct + 194 orphaned + more).

**Lesson**: NEVER mark operations complete without:
1. Verifying actual state (row counts, manual queries)
2. User confirmation that problem is actually solved
3. Testing expected side effects explicitly (CASCADE, triggers, etc.)

---

### Example 2: Timeout, Not Backend Issue (#2025-10-19)

**Initial Diagnosis**: "Backend must be slow or broken"

**User Feedback**: "Works manually in 10 seconds"

**Pivot**: Check timeout configuration.

**Root Cause**: Timeout set to 5 seconds, but operation takes 8-10 seconds.

**Lesson**: "Works manually" + "fails in automated check" = immediately check timeout settings.

---

### Example 3: Check Error Context First (#2025-10-19)

**Initial Approach**: Assumed backend API errors from failure messages.

**Wasted Time**: 30 minutes investigating service logs.

**Should Have Done**: Read error context files first.

**Discovery**: Context files show full state snapshot at failure point + screenshots.

**Actual Issue**: Frontend wasn't calling API at all - interaction not triggering handler.

**Lesson**: Check error context files and screenshots before assuming backend issues.

---

### Example 4: Grep for Similar Solutions (#2025-10-09)

**Problem**: Issue not working after 8 different attempts.

**Should Have Done First**:
```bash
grep -r "similar-pattern" src/
grep -r "related-function" src/
```

**Discovery**: Existing pattern in codebase that solves exact problem.

**Time Saved**: ~20 minutes by checking existing patterns before implementing new solutions.

**Lesson**: Search for similar solved problems in codebase before trying novel approaches.

---

### Example 5: Timeouts ≠ Feature Failures (#2025-10-30)

**Initial Diagnosis**: "Service is failing - operations show error messages"

**Evidence**:
- 9 operations failing with error message
- Operations timeout waiting for completion
- Logs show 49 invocations, ALL returned success ✅

**Investigation Steps**:
1. Checked logs for service function
2. Found response bodies with valid content (6000+ characters)
3. Extracted execution timestamps from logs:
   - Cold start: 75 seconds
   - Warm: 10 seconds
4. Compared to timeout configuration: Only 45 seconds
5. **Root Cause**: Operations timeout BEFORE service responds

**Why Error Appears**:
- Frontend's handler has error fallback that shows user-friendly message
- When operations time out, frontend shows this error
- But NOT because service failed - because client gave up waiting

**Fix**: Increase timeouts from 45s → 90s to accommodate cold start (15s buffer)

**Lesson**: When showing error message, don't assume that error is real. Infrastructure (cold start, network) can cause timeouts before response arrives. Always verify with service logs + timestamps.

---

## When to Apply These Principles

### Before Starting Debugging
- ✓ Read error context files (context files, screenshots, logs)
- ✓ Check timeouts and environment configuration
- ✓ Grep for similar solved problems in codebase
- ✓ Review framework docs for framework-specific issues

### During Investigation
- ✓ Verify actual state (database, files, logs) vs messages
- ✓ Accept feedback quickly, pivot if wrong direction
- ✓ Check configuration before assuming code issues
- ✓ Be systematic - don't randomly try solutions

### When Stuck
- ✓ Don't give up after 3-4 attempts on complex issues
- ✓ Consider using specialized debugging tools/agents
- ✓ Ask user for guidance or additional context
- ✓ Review architectural principles (might be fighting wrong problem)

### After Data Operations
- ✓ Verify state with manual queries/checks
- ✓ Test expected side effects explicitly
- ✓ Get user confirmation problem actually solved
- ✓ Don't trust output messages alone

---

## Related Topics

- **TESTING**: Error context files, configuration, timeout settings
- **PROCESS**: User feedback signals, systematic approaches, tool usage
- **ARCHITECTURE**: Root cause investigation, no workarounds
- **CI-CD**: Verification before push, iterative debugging discipline

---

**Last Updated**: 2025-12-07 (added principle #5: verify volume state before destructive cleanup)
**Sessions Covered**: 20 retrospectives (2025-10-07 to 2025-12-07)
**Principles Count**: 19
