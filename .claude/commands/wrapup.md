---
description: "Complete session wrap-up: retrospective, CHANGELOG, TODO cleanup, and RETROSPECTIVES update"
---

You are completing a development session. Follow this workflow systematically:

## Step -1: Branch Merge Workflow (Feature Branch → Main)

**Check current branch**:
```bash
git branch --show-current
```

### If on Feature Branch (feature/*, fix/*, test/*, docs/*, refactor/*):

This is a feature branch that needs to be merged to main. Follow merge workflow:

#### Step -1.1: Update Main Branch

```bash
# Fetch latest main
git fetch origin main

# Switch to main temporarily
git checkout main

# Fast-forward to latest
git pull --ff-only origin main
```

If `--ff-only` fails (local main diverged):
```
⚠️ Your local main has commits not on remote.
This shouldn't happen in normal workflow.

What happened:
[Show: git log origin/main..main --oneline]

Options:
  1. Reset local main to match remote (recommended - discards local main commits)
  2. Merge remote into local main (if you know what you're doing)
  3. Abort wrapup and investigate manually

Choice: _______
```

If user chooses 1:
```bash
git reset --hard origin/main
```

#### Step -1.2: Check if Feature Branch Diverged from Main

```bash
# Switch back to feature branch
git checkout [feature-branch]

# Check if main has commits we don't have
git rev-list --count HEAD..main
```

**If main has diverged** (count > 0):

Show recent main commits:
```bash
git log --oneline main ^HEAD -5
```

Ask user:
```
ℹ️ Main has [N] new commits since you branched.

Recent commits in main:
[Show output from git log above]

Merge main into feature branch before running tests?
(Recommended - ensures tests run against latest main)

Options:
  1. Yes, merge main into feature branch (recommended)
  2. No, skip (may cause conflicts during final merge)

Choice: _______
```

**If user chooses 1** (merge main):
```bash
git merge main
```

**Handle conflicts** (same as /checkpoint):
```
⚠️ Merge conflicts detected in [N] files:
[List: git diff --name-only --diff-filter=U]

Next steps:
  1. Edit files to resolve conflicts (use vi):
     [List: vi path/to/file for each conflict]

  2. Look for conflict markers:
     <<<<<<< HEAD (your feature branch)
     your changes
     =======
     main branch changes
     >>>>>>> main

  3. After resolving, tell me 'conflicts resolved' to continue

OR type 'abort' to cancel wrapup.
```

Wait for user response:
- If "conflicts resolved":
  ```bash
  git add .
  git diff --check  # Verify no unresolved conflicts
  ```
  - If clean: "✅ Conflicts resolved"
  - If errors: "❌ Conflicts still unresolved, please fix"

- If "abort":
  ```bash
  git merge --abort
  ```
  - Exit wrapup

**If user chooses 2** (skip):
- "⚠️ Proceeding without main merge. May encounter conflicts in Step -1.4."

#### Step -1.3: Run Full Test Suite on Merged Branch

**CRITICAL**: Tests must pass before merging to main.

```bash
echo "Running full test suite..."
npx vitest run && \
npx tsc --noEmit && \
npx eslint .
```

**If any tests fail**:
```
❌ Tests failed. Cannot merge to main with failing tests.

Failures:
[Show which checks failed with brief summary]

This is a HARD REQUIREMENT. You MUST fix failures before merging.

Options:
  1. Fix failures now (required)
  2. Abort wrapup, stay on feature branch
  3. Push feature branch to GitHub for later (WIP)

What would you like to do?
```

- **Option 1**: "Please fix failures. Run /wrapup again when tests pass."
- **Option 2**: Exit wrapup
- **Option 3**:
  ```bash
  git push origin [feature-branch]
  ```
  - "Feature branch pushed to GitHub. Fix failures and /wrapup later."
  - Exit wrapup

**If tests pass**:
```
✅ All tests passing
  - vitest: ✅
  - tsc: ✅
  - eslint: ✅

Ready to merge to main.
```

#### Step -1.4: Merge Feature Branch into Main

```bash
# Switch to main
git checkout main

# Merge feature branch
git merge [feature-branch] --no-ff -m "Merge [feature-branch]: [TODO item title]

[Brief description of what was accomplished]

Tests: ✅ All passing
"
```

**If merge has conflicts** (shouldn't happen if we merged main into feature in Step -1.2):
```
⚠️ Unexpected conflicts during merge to main.
This shouldn't happen if you merged main into feature branch earlier.

[Same conflict resolution workflow as before]
```

**If merge succeeds**:
```
✅ Merged [feature-branch] → main
```

#### Step -1.5: Push Main and Feature Branch

```bash
# Push updated main
git push origin main

# Push feature branch (keep for history)
git push origin [feature-branch]

# Delete local feature branch (keep remote)
git branch -d [feature-branch]
```

Report:
```
✅ Branch Merge Complete

📦 Merged: [feature-branch] → main
📤 Pushed: main + feature branch to GitHub
🗑️  Deleted: local branch (remote kept for 30 days)
🌿 Current: main branch

You can now continue with session documentation (CHANGELOG, TODO, learnings).
```

### If Already on Main Branch:

User worked directly on main (old workflow or hotfix). Skip merge workflow.

```
ℹ️ You're on main branch. Skipping feature branch merge workflow.

Note: Consider using feature branches for future work (/start auto-creates them).
      This allows safer parallel work and easier rollback.

Proceeding with documentation updates...
```

## Step 0: Pre-Wrap-Up Verification (Recommended for Code Changes)

If code changes were made this session, verify test coverage:

### 0.1: Unit Test Verification
- **Identify changed components**: Review what files were modified
- **Run relevant tests**:
  ```bash
  # A specific test file
  npx vitest run tests/<file>.test.ts

  # Full suite
  npm test
  ```
- **Check results**:
  - ✅ All passing → Good to proceed
  - ❌ Any failing → Note for retrospective (why didn't we catch this during development?)

### 0.2: Regression Test Review
If this session included bug fixes:
- **Ask**: Did we add regression tests?
- **If NO**: Should we have? (Use decision tree from TESTING.md line 413-446)
- **If YES**: Verify test is meaningful (covers actual bug scenario, not just "makes coverage green")

### 0.3: Test Coverage Note
If tests weren't run or are failing:
- Note this in retrospective (Step 1) under "What could be improved"
- Consider if testing workflow needs adjustment

## Step 1: Session Retrospective (Internal Analysis)
Analyze the session and prepare answers for:
- What did we accomplish? (brief - details go in CHANGELOG)
- What went well? (process, decisions, communication)
- What could be improved? (efficiency, approach, tool usage)
- What did we learn? (meta-learning, not implementation details)
- Key patterns to repeat vs avoid

## Step 2: Update CHANGELOG.md
Review recent commits and ensure CHANGELOG has comprehensive entry for completed work:
- Read recent git commits: `git log --oneline -10`
- Check if commits already documented in CHANGELOG
- If NOT documented: Add detailed CHANGELOG entry with:
  * Implementation phases
  * Files changed with line numbers
  * Technical decisions
  * Performance improvements
  * Related fixes
  * Commits list
  * Impact summary

## Step 3: Update TODO.md
Clean up completed items to keep TODO focused on upcoming work:

### 3.1: Update "Recently Completed" Section
- Keep ONLY last 3 completed sessions in "RECENTLY COMPLETED" section
- Each entry should be ONE LINE with phase name, date, and 1-2 key achievements
- Format example:
  ```markdown
  - [x] **Phase X.Y: Brief Name** → ✅ COMPLETED (YYYY-MM-DD)
    - Key achievement 1, Key achievement 2
  ```
- Remove older completed items (they're in CHANGELOG already)

### 3.2: Remove Old Completed Detail Sections
- In "DETAILS SECTION", remove any sections for completed phases (marked with ✅ COMPLETED)
- Completed detail sections duplicate CHANGELOG - delete them entirely
- Keep ONLY pending/future task details

### 3.3: Keep TODO Forward-Looking
- High priority section: ONLY uncompleted tasks
- Future ideas section: Keep as-is
- Details section: ONLY for tasks NOT yet started or in progress
- Add note: "See CHANGELOG.md for complete implementation details of all completed phases"

## Step 4: Update Learning Files
Add session learnings to appropriate files (focus on HOW we work, not WHAT we built):

### 4.1: Determine Universal vs Project-Specific

Ask for EACH learning: "Would this apply to other projects?"

**Universal learnings** (add to `docs/learnings/universal/`):
- ✅ Verification discipline (never declare success without checking)
- ✅ Composite selectors for complex UI (applies to all UI testing)
- ✅ Root cause investigation patterns (applies everywhere)
- ✅ User skepticism catches hidden failures (applies to all collaboration)
- ✅ Check existing patterns before implementing (applies to all codebases)

**Project-specific learnings** (add to `docs/learnings/project/`):
- ❌ "PartyResultCard's accordion needs a stable key or it collapses on re-render" (React/this codebase only)
- ❌ "Gemini structured-output schemas must list every party+topic key as `required`" (this app's AI routes only)
- ❌ "`lib/parties.ts` and `data/groundings/*.json` must be kept in sync when either changes" (this codebase's data model only)
- ❌ Component-specific workarounds or configuration quirks

**When in doubt**: Start with project-specific. Promote to universal later if pattern recurs across sessions.

### 4.2: Update Universal Files (Rarely)

Only update `docs/learnings/universal/` if:
- ✅ Truly transferable principle discovered
- ✅ Reinforces existing universal principle (add date tag)
- ✅ New cross-cutting theme emerges

**Be conservative** - universal files are copied to other projects, keep signal high.

For each relevant universal topic file:
- **Add new principle** if fundamental insight discovered
  * Format: One-liner with date tag `(#first:YYYY-MM-DD)`
  * Include: What happened, lesson learned, future action
- **Update existing principle** if reinforced this session
  * Add reinforcement tag `(#first:YYYY-MM-DD #reinforced:YYYY-MM-DD,YYYY-MM-DD)`
- **Add reference example** if particularly illustrative
  * Problem/situation, approach taken, outcome, lesson
- **Keep file under 500 lines** - if growing too large, consider split

### 4.3: Update Project Files (Freely)

Update `docs/learnings/project/` without hesitation:
- Create new files as needed (e.g., `project/TESTING-PATTERNS.md` for React/Vitest specifics)
- Add concrete examples with file:line references
- Document workarounds and their reasons
- Capture infrastructure quirks (Gemini quota/rate limits, Langfuse indexing lag, etc.)
- Reference specific technologies (Gemini structured output, Langfuse, Upstash rate limiting, React hooks, etc.)

**Project files structure** (create as needed):
- `project/TESTING-PATTERNS.md` - Test framework specifics, mock patterns
- `project/DEBUGGING-PATTERNS.md` - Infrastructure debugging, service quirks
- `project/ARCHITECTURE-PATTERNS.md` - Domain-specific patterns, tech stack decisions

### 4.4: Update INDEX.md (If Needed)
Only update `docs/learnings/INDEX.md` if:
- New cross-cutting theme emerges (pattern appearing in 3+ topics)
- Quick Wins list should change (more impactful principle discovered)
- Statistics need updating (after major sessions)

## Step 5: Commit Documentation Updates
If you made documentation changes:
```bash
git add CHANGELOG.md TODO.md docs/learnings/
git commit -m "docs: Session wrap-up for [date] - [brief description]

- Updated CHANGELOG with [phase/feature] completion details
- Cleaned up TODO.md (removed [X] lines of completed details)
- Updated learning files:
  * Universal: [list universal/ files modified if any]
  * Project: [list project/ files modified if any]

Key learnings: [1-2 key insights - note if universal or project-specific]
"
git push
```

## Step 6: Summary Report
Provide concise summary:
```
✅ Session Wrap-Up Complete

📊 Accomplishments:
- [Brief list]

📚 Documentation Updated:
- CHANGELOG: [what was added]
- TODO: [what was cleaned/updated]
- Learning Files:
  * Universal: [files updated, if any]
  * Project: [files updated with project-specific patterns]

🎯 Key Learnings:
1. [Learning 1]
2. [Learning 2]

📦 Commits: [commit hashes if any]
```

---

**Important Guidelines**:
- CHANGELOG = What we built (implementation details)
- TODO = What we're building (forward-looking)
- Learning Files = How we work (process learnings, distilled principles)
- Focus learnings on meta-learning, not implementation details
- **Universal vs Project**: Default to project-specific, promote to universal conservatively
- Add date tags: `(#first:YYYY-MM-DD #reinforced:YYYY-MM-DD,YYYY-MM-DD)`
- Update project files freely, universal files rarely
- Be honest about what could be improved
- Capture actionable lessons that change Claude's behavior
