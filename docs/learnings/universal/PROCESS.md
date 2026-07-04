# Development Process & Workflow Learnings

**Purpose**: Universal process principles for user collaboration, session management, planning, and documentation.

---

## Core Principles

### User Feedback & Collaboration

1. **User feedback can redirect approach positively** - "Think as senior QA managers" stopped quick fixes, redirected to understanding actual behavior. Tests now verify real behavior vs masking issues.
   [Cross-cutting: TESTING #35, DEBUGGING #4, CI-CD #4]
   (#first:2025-10-23)

2. **User refinement cycles catch ambiguity early** - Quick iteration (concept → translation → implementation → review) can deliver in <1 hour when responsive to feedback. (#first:2025-10-23)

3. **User collaboration on decisions builds ownership** - Walk through decision points with tradeoffs and recommendations, let user decide. User understands rationale, can defend to stakeholders. (#first:2025-10-22)

4. **User skepticism more valuable than automated messages** - User feedback led to discovering bugs despite automated success messages. Trust human intuition over automation.
   [Cross-cutting: TESTING #35, DEBUGGING #4, CI-CD #4]
   (#first:2025-10-21)

5. **User status updates prevent wasted effort** - When resuming sessions, ask "what's been completed?" before planning next steps. Prevents proposing unnecessary work. (#first:2025-10-10)

6. **Explain technical concepts when user shows confusion** - When user asks "Why?", provide detailed explanation with visual breakdown. Enables informed decisions. (#first:2025-10-22)

7. **Ask clarifying questions before making assumptions** - "Are we sure we're fixing the right thing?" can save wasted effort on unnecessary changes. Verify assumptions before implementing. (#first:2025-10-23)

8. **User "sanity check" questions redirect to better solutions** - "Are we sure we want the fallbacks?" can lead to re-checking principles, resulting in proper root cause fix instead of masking problem. User catches violations of documented principles.
   [Cross-cutting: ARCHITECTURE #3, TESTING #35, CI-CD #4]
   (#first:2025-11-06)

9. **Preserve user artifacts when creating alternatives** - When creating variants, always preserve originals alongside new versions - prevents data loss and enables flexibility. (#first:2025-10-23)

10. **User saying "this is annoying" means stop and fix immediately** - When user complains about UX ("tons of lines again", "I don't know if this was good"), stop everything and fix the root cause. They're right - don't dismiss with workarounds. User complained about verbose output → we fixed cache merging UX and summary reports. User catches what we normalize.
   [Cross-cutting: DEBUGGING #4, ARCHITECTURE #3]
   (#first:2025-11-19)

11. **User questioning "should we?" signals need for analysis, not just implementation** - When user asks "should we really NOT install GPU stuff?", pause implementation and analyze trade-offs comprehensively. User's question prevented premature CPU-only solution, led to multi-architecture strategy. "Should we?" means analyze alternatives, not just fix the immediate problem.
   [Cross-cutting: ARCHITECTURE #1, PLANNING]
   (#first:2025-11-28)

12. **Product manager thinking catches engineering blind spots** - User's "think as PM/architect" question revealed distribution architecture gap we missed. Engineers optimize for current use case (GitHub repo), PMs see future distribution tiers (Docker Hub, MCP marketplace). When user shifts perspective, follow the analysis.
   [Cross-cutting: ARCHITECTURE #1]
   (#first:2025-11-28)

13. **Multi-agent product reviews enable comprehensive strategic analysis** - For complex strategic decisions (distribution plans, pricing, GTM), use multi-agent reviews (5+ specialized agents analyzing different dimensions). Composite scoring (Market Differentiation, User Value, Technical Feasibility, Business Viability, Adoption/GTM) reveals blind spots single-perspective analysis misses. User decisiveness increases when presented with clear paths (A/B/C) with tradeoffs vs open-ended "what should we do?" Example: Distribution plan review (7.0/10 composite) identified critical blocker (Docker MCP Toolkit multi-container test) and GTM gap that single-agent analysis missed.
   [Cross-cutting: PLANNING]
   (#first:2025-12-16)

### Session Management & Recovery

14. **Crash recovery requires systematic context reconstruction** - Read guidelines → retrospective → TODO → git log → check status. Enables <5 min recovery vs hours of confusion. (#first:2025-10-23)

15. **Parallel work increases session efficiency** - When waiting for long-running tasks, use time for other improvements. Accomplish 3 distinct tasks vs single-threading. (#first:2025-10-23)

16. **Iterative cleanup catches what automation misses** - Large reorganizations benefit from 2-3 verification cycles with user feedback. (#first:2025-10-15)

17. **Automation enables parallel operations at scale** - For 10+ similar operations, use automation/specialized tools. Saves ~25 minutes vs manual operations. (#first:2025-10-15)

### Planning & Phasing

41. **Product/user perspective FIRST — before implementation options** — Planning proposals must open with the product and user perspective (user journey, satisfaction, what changes for the user) BEFORE presenting technical options. Engineering-first plans get approved or rejected on wrong criteria. This session: the first planning agent presented a fully deterministic architecture that would have removed all AI agency from the flow. The user spotted the direction error only after asking explicitly for a product-level explanation — significant time and tokens wasted. A product-first plan would have surfaced the constraint ("we are building an AI assistant, AI should drive the conversation") before any implementation was designed.

   **Required structure for any non-trivial plan:**
   1. Product impact: what changes for the user? (user journey, satisfaction, what's better/worse)
   2. Design principle: what constraint governs the approach? (e.g., "AI agency must be preserved")
   3. Implementation: how does the code change?

   If the user can't evaluate the plan without reading the implementation section, the plan is structured wrong. (#first:2026-06-26)

42. **Fresh-agent "from-scratch thinking" as a verification practice** — When deep in a technical implementation (especially after context accumulates), spawning a fresh agent with ONLY the product problem — no solution context, no current architecture — produces genuinely independent thinking that can catch fundamental direction errors.

   **This session pattern:**
   - First planning agent: inherited session context → anchored on wrong direction (deterministic > AI)
   - Second planning agent: given only product constraint ("AI assistant — direction must be AI-driven") → arrived at the correct architecture independently

   **When to use:**
   - When a planning output feels off but it's hard to articulate why
   - When you notice yourself defending a direction rather than evaluating it
   - After any complex planning session before starting implementation
   - When the user signals uncertainty ("I'm not sure about this direction")

   **Key rule:** give the fresh agent ONLY the product problem and constraints — NOT the current solution. The value comes from independence from session bias. If the agent independently arrives at the same approach, confidence is higher. If it diverges, that's a signal to re-examine. (#first:2026-06-26)

18. **Check version/dependency requirements early in setup** - When integrating external systems (APIs, protocols, frameworks), verify version requirements BEFORE troubleshooting. Saves time by catching root cause immediately. Example: MCP required Claude Desktop v0.14.10+, but v0.12.16 installed → spent time troubleshooting config/paths before version check revealed simple issue.
   [Cross-cutting: DEBUGGING]
   (#first:2025-11-11)

18. **Phase-by-phase approach maintains focus** - Break complex features into phases (Infrastructure → Frontend → Deployment → Verification) with user checkpoints. Prevents scope creep, enables clear progress tracking.
   [Cross-cutting: TESTING #34, DEBUGGING #8, AI-PROMPTS #5]
   (#first:2025-10-22 #reinforced:2025-10-21)

19. **Verify requirements before implementing** - Check authoritative docs during planning, not after building. Saves potential rework. (#first:2025-10-23)

20. **Research alternatives before accepting expensive solutions** - Expensive solutions aren't always better. Research free/native alternatives with better UX before committing. (#first:2025-10-22)

21. **Ask before committing to complex work** - When plans include optional enhancements, ask user for confirmation before starting. Clarify priorities to avoid 2-3 hours unnecessary work. (#first:2025-10-12)

22. **Multiple report formats serve different audiences** - Executives need summaries, developers need technical details, QA needs checklists. One format serves no audience well. (#first:2025-10-21)

23. **Fresh session for major new work after cleanup** - When session completed significant work, start NEW fresh session for next major task instead of continuing. Prevents context pollution, enables focused approach. (#first:2025-10-24)

24. **Clean while context is fresh** - When reorganizing or refactoring, user's instinct to "clean everything now" prevents future confusion. Complete related cleanup while full context is in memory rather than deferring. Prevents technical debt accumulation.
   [Cross-cutting: ARCHITECTURE #3]
   (#first:2025-11-10)

### Documentation

25. **Document incrementally, not in batch** - Write documentation while implementing, not as separate phase. Easier to recall details, prevents forgetting items. (#first:2025-10-12 #reinforced:2025-10-07)

26. **Document rejected alternatives with context** - Create comparison tables explaining WHY we chose X over Y with tradeoffs, effort estimates, decision rationale. Preserves context for future. (#first:2025-10-12 #reinforced:2025-10-10, 2025-11-30)

27. **"Roads Not Taken" sections prevent revisiting settled decisions** - Don't just remove rejected ideas from plans - document WHY they were rejected. Format: Proposed Idea → Why Considered → Why Rejected → Approved Alternative → Lesson Learned. Prevents future developers from restarting the same debate. User feedback: "I'd not just 'remove the freemium' parts, I'd rather document that this was an idea that was raised, and we took it down (and why)." Institutional memory matters more than clean final docs.
   [Cross-cutting: ARCHITECTURE #strategic-decisions]
   (#first:2025-11-30)

28. **Research link preservation ensures traceability** - When consolidating research into execution plans, add explicit "RESEARCH SOURCES" section linking back to source documents and key external URLs. Don't assume research docs will be read - make links discoverable from the execution plan itself. User caught missing research links after consolidation. 167 citations preserved via dedicated sources section.
   [Cross-cutting: DOCUMENTATION #traceability]
   (#first:2025-11-30)

29. **Documentation needs enforcement mechanisms, not just good intentions** - Guidelines alone don't work. Build layered system: guidelines (always read) + commands (explicit checklists) + learning files (workflow integration) + retrospectives (check). Make "future Claude" actually follow principles through tools, not memory. (#first:2025-11-06)

30. **Comprehensive specifications prevent future confusion** - Future work needs same detail as current work (task breakdowns, time estimates, implementation recommendations) to prevent confusion later. (#first:2025-10-10)

31. **Verify implementation before documenting** - Read actual code files to confirm what was built. Document reality, not assumptions or original plans. (#first:2025-10-10)

32. **User catches documentation gaps before commit** - User proactively identifies missing documentation updates (README, CLAUDE.md) that Claude missed. Ask "should these instructions be added to other places?" catches omissions. User caught missing Docker versioning instructions in README/CLAUDE.md after implementation complete. (#first:2025-11-XX #reinforced:2025-12-03)
   [Cross-cutting: Version Control]
   (#first:2025-11-11)

### Verification & Quality

31. **Verify file locations before reading** - Don't assume file paths based on directory names or conventions. Always check actual file system structure before reading/editing files. Prevents wasted tool calls and incorrect assumptions.
   [Cross-cutting: DEBUGGING #2]
   (#first:2025-11-10)

32. **Audit related files proactively during refactoring** - When fixing references or reorganizing, check ALL files that might reference old paths/structures. Use grep to search comprehensively rather than fixing issues reactively as they're discovered.
   [Cross-cutting: ARCHITECTURE #3]
   (#first:2025-11-10)

33. **Proactively verify test coverage when adding features** - User asked "can you check if we're covered there?" after implementing new features. Don't wait for user to ask - check test coverage proactively when adding functionality. Caught missing tests for batching, error handling, persistence.
   [Cross-cutting: TESTING #1]
   (#first:2025-11-13)

34. **Measure before documenting technical specifications** - Don't document estimates or assumptions as facts. Verify actual measurements (image sizes, performance benchmarks, resource usage). Docker GPU image was 4.49GB, not estimated 12GB. Measured data builds user trust.
   [Cross-cutting: ARCHITECTURE #1]
   (#first:2025-11-28)

### Version Control

35. **Explain potentially destructive commands first** - Even if safe, explain commands before using. Prevents user anxiety about losing changes. (#first:2025-10-10)

36. **Commit logical units separately** - User values complete history. Commit related changes separately rather than discarding. (#first:2025-10-10)

37. **Risk-based categorization** - Group changes as low (patches), medium (minor versions), high (major breaking changes). Prevents "update everything and hope" chaos. (#first:2025-10-10)

38. **Explicit risk acceptance documentation** - For moderate/low risks, document acceptance decision with mitigation timeline. Better than ignoring or over-fixing. (#first:2025-10-10)

41. **Verify current branch before committing in a shared working directory** - If a user runs concurrent sessions against the same checkout (no worktree isolation), a commit can land on whatever branch the *other* session last checked out, not the one the current conversation started on. Check `git branch --show-current` immediately before commit if the session was restarted or ran long, and confirm before pushing if the branch name doesn't match the work just done. (#first:2026-07-01)

### Consistency

39. **Proactive consistency checking improves UX** - When adding features, scan for consistency opportunities. Apply new pattern wherever similar pattern appears. (#first:2025-10-22)

40. **Separate gated vs non-gated work** - Create clear boundaries for work that requires external approval. Enables independent execution of some tasks. (#first:2025-10-11)

42. **Don't default to team-scale commitments (SLAs, response times) in user-facing copy without checking who's actually operating the service** — Added "we review every report within 5 business days" to a quote-dispute/security-disclosure flow, following the generic convention for this kind of copy (most real-world examples come from teams with on-call rotations). The user — a solo maintainer — correctly pushed back: a fixed response-time commitment doesn't make sense for one person running an independent project, even though the same sentence reads as perfectly normal boilerplate. Removed the timeline, kept the substance ("we review every report"). Check who's actually on the hook before writing a numeric commitment into copy; the same disclosure/correction process usually reads fine without one. (#first:2026-07-04)

---

## Anti-Patterns to Avoid

- ❌ Ignoring user skepticism about suspicious results
- ❌ Proposing work without checking what's already complete
- ❌ Batch documentation at end instead of incremental updates
- ❌ Committing to complex work without user confirmation
- ❌ Single-threading when tasks could run in parallel
- ❌ Using destructive commands without explanation
- ❌ One-size-fits-all documentation for all audiences
- ❌ Assuming implementation matches original plan without verification
- ❌ Missing consistency opportunities when adding features
- ❌ Relying on good intentions to follow guidelines - need enforcement tools
- ❌ Assuming file locations without checking first
- ❌ Fixing references reactively (wait for errors) instead of proactively (audit all related files)
- ❌ Deferring related cleanup to "later" (creates technical debt)
- ❌ Committing personal data (usernames, paths) in documentation without placeholders
- ❌ Starting integration troubleshooting without checking version requirements first

---

## Reference Examples

### Example 1: User Feedback Redirects Approach (#2025-10-23)

**Initial Approach**: Fixing tests by making them pass quickly.

**User Feedback**: "I'd like to ensure that we're thinking as senior QA managers... testing what's needed, not just taking the simple path."

**Pivot**: Stopped, investigated component behavior, understood root cause.

**Result**: Used proper patterns that test actual behavior.

**Lesson**: User feedback catches shortcuts - redirect to better approach when challenged.

---

### Example 2: Phased Implementation (#2025-10-22)

**Task**: Implement complex feature.

**Phasing Strategy**:
- **Phase 1**: Infrastructure (config, setup, dependencies)
- **Phase 2**: Core functionality (main feature implementation)
- **Phase 3**: Integration (connecting components)
- **Phase 4**: Verification (testing, validation)

**Checkpoints**: User approval after each phase before proceeding.

**Benefits**:
- Clear progress tracking
- Early course correction if issues discovered
- No scope creep - each phase has defined boundaries
- User can stop/pivot at any checkpoint

---

### Example 3: Parallel Work During Wait Times (#2025-10-23)

**Situation**: Waiting for long-running task (~5-10 minutes).

**Single-Threaded Approach**: Wait, watch output, then start next task.

**Parallel Approach**:
- Started task in background
- Fixed other issues while task running
- Reorganized structure
- Returned to task results when available

**Result**: Completed 3 distinct improvements in one session vs sequential execution.

---

### Example 4: Document Rejected Alternatives (#2025-10-12)

**Decision**: Simple approach vs complex alternative.

**Documentation**:
```markdown
## Decision: Simple Approach

### Options Considered
| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| Complex | Feature-rich | High maintenance | 2-3 hours |
| Simple | Easy to maintain | Limited features | 0 hours |

### Decision: Simple Approach
Rationale: Principle - "Don't over-engineer"
- Standard solution works for use case
- Zero maintenance burden
- Saved: 2-3 hours implementation + ongoing maintenance
```

**Lesson**: Future developers understand WHY we chose simpler solution, can revisit if requirements change.

---

### Example 5: Crash Recovery Protocol (#2025-10-23)

**Situation**: Interruption during work.

**Recovery Process** (< 5 minutes):
1. Read guidelines - refresh principles
2. Read retrospective - recall recent learnings
3. Read TODO - understand current state
4. Check git log - see what was committed
5. Check CI status - verify builds passing

**Result**: Quickly identified exact state and resumed work.

**Lesson**: Context files + git history enable rapid session recovery. Maintain them religiously.

---

## When to Apply These Principles

### Session Start
- ✓ Ask user for status updates before planning work
- ✓ Review guidelines, TODO, and relevant learning topics
- ✓ Check version requirements for external integrations early
- ✓ Identify opportunities for parallel work
- ✓ Break complex tasks into phases with checkpoints

### During Development
- ✓ Document decisions and rejected alternatives as you go
- ✓ Run long tasks in background, work on other items
- ✓ Scan for consistency opportunities when touching area
- ✓ Verify implementation matches intent before documenting

### User Interaction
- ✓ Listen to user skepticism - investigate suspicious results
- ✓ Explain technical concepts when confusion detected
- ✓ Present tradeoffs and recommendations, let user decide
- ✓ Ask before committing to complex optional work

### Version Control
- ✓ Explain potentially destructive commands before using
- ✓ Commit logical units separately for clear history
- ✓ Document risk acceptance for decisions
- ✓ Categorize changes by risk level

### Documentation
- ✓ Write incrementally while implementing
- ✓ Create comparison tables for major decisions
- ✓ Provide comprehensive specs for future work
- ✓ Use placeholders for personal data (usernames, paths, credentials)

---

## Related Topics

- **TESTING**: Phased test initiatives, user feedback on QA approach
- **DEBUGGING**: User verification catches issues, systematic context loading
- **ARCHITECTURE**: Research alternatives, check principles
- **CI-CD**: Parallel work strategies, cost consciousness

---

36. **Subagents inherit session tool permissions — confirm before spawning** — WebSearch/WebFetch blocked in main session = blocked in subagents too. Verify tool permissions are granted before launching parallel research agents, or do the research in the main conversation thread. (#first:2026-03-28)

---

**Last Updated**: 2026-03-28 (added subagent tool permission inheritance principle)
**Sessions Covered**: 21+ retrospectives (2025-10-07 to 2026-03-28)
**Principles Count**: 36
