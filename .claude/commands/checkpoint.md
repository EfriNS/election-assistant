---
description: "Save work-in-progress: run tests, sync with main, push branch to GitHub"
---

You are checkpointing the current session's work. Follow this workflow systematically:

## Step 1: Verify Git State

Check that we're on a feature branch (not main):

```bash
git branch --show-current
```

**If on main branch**:
- ⚠️ "You're on main branch. Checkpoints are for feature branches.

  Options:
  1. Use /start to create a feature branch first
  2. Create branch manually: git checkout -b feature/your-feature-name
  3. Continue anyway (will commit to main - not recommended)

  What would you like to do?"

**If on feature branch**:
- Proceed to Step 2

## Step 2: Stash Uncommitted Changes (if any)

Check for uncommitted changes:
```bash
git status --short
```

**If uncommitted changes exist**:
```bash
git stash push -m "checkpoint: auto-stash before sync"
```

## Step 3: Sync with Main Branch

Fetch latest main and check if it has diverged:

```bash
# Fetch latest main (don't switch to it)
git fetch origin main

# Check if main has new commits since we branched
git rev-list --count HEAD..origin/main
```

**If main has diverged** (count > 0):
- Ask user: "ℹ️ Main has [N] new commits since you branched.
  Merge them into your feature branch now?
  (Recommended to avoid conflicts later)

  Recent commits in main:
  [Show last 3 commits with: git log --oneline origin/main -3]

  Options:
  1. Yes, merge main into my feature branch (recommended)
  2. No, skip for now (I'll handle at /wrapup)
  3. Show me full diff of what changed in main

  Choice: ___"

**If user chooses 1** (merge main):
```bash
git merge origin/main
```

**Handle merge conflicts**:
- If conflicts detected:
  ```
  ⚠️ Merge conflicts detected in [N] files:
  [List files with: git diff --name-only --diff-filter=U]

  Git has marked conflicts with <<<<<<< HEAD markers.

  Next steps:
  1. Edit files to resolve conflicts:
     [List commands: vi path/to/file for each conflicted file]

  2. Look for conflict markers:
     <<<<<<< HEAD
     your changes
     =======
     main branch changes
     >>>>>>> origin/main

  3. After resolving, tell me 'conflicts resolved' to continue

  OR type 'abort' to cancel this checkpoint.
  ```

**Wait for user response**:
- If user says "conflicts resolved":
  ```bash
  # Stage resolved files
  git add .

  # Verify no unresolved conflicts remain
  git diff --check
  ```

  If `git diff --check` shows errors:
  - "❌ Conflicts still unresolved. Please fix all conflict markers."
  - Return to waiting for user

  If clean:
  - "✅ Conflicts resolved, continuing..."
  - Proceed to Step 4

- If user says "abort":
  ```bash
  git merge --abort
  git stash pop  # Restore stashed changes if any
  ```
  - "Checkpoint aborted. You're back on your feature branch."
  - Exit command

**If user chooses 2** (skip merge):
- "⚠️ Skipping main sync. You may encounter conflicts at /wrapup."
- Proceed to Step 4

**If user chooses 3** (show diff):
```bash
git diff HEAD..origin/main --stat
```
- After showing diff, re-ask the merge question (Options 1 or 2)

**If main has NOT diverged** (count = 0):
- "✅ Your branch is up-to-date with main"
- Proceed to Step 4

## Step 4: Restore Uncommitted Changes

If we stashed changes in Step 2:
```bash
git stash pop
```

**If stash pop has conflicts**:
- "⚠️ Your uncommitted changes conflict with the merge.
  Git has marked conflicts in your working directory.

  Please resolve conflicts in:
  [List conflicted files]

  Tell me 'ready' when resolved, or 'abort' to cancel."

Wait for user, then continue.

## Step 5: Run Full Test Suite

Run comprehensive test suite:

```bash
# Activate venv if not already active
source .venv/bin/activate

# Run all quality checks
echo "Running pytest..."
pytest --tb=short

echo "Running black..."
black --check src/ tests/

echo "Running ruff..."
ruff check src/ tests/

echo "Running mypy..."
mypy src/
```

**Collect results**:
- Track which commands passed/failed
- Capture error summaries

**If any tests fail**:
- "❌ Tests failed. Cannot checkpoint broken code.

  Failures:
  [List which checks failed with brief error summary]

  Options:
  1. Fix failures now (recommended)
  2. Push anyway with --force flag (not recommended, marks as WIP)
  3. Abort checkpoint

  What would you like to do?"

**If user chooses 1** (fix now):
- "Please fix the failures. When ready, run /checkpoint again."
- Exit command

**If user chooses 2** (force push):
- "⚠️ Proceeding with failing tests (WIP checkpoint)"
- Continue to Step 6 (but mark commit as WIP)

**If user chooses 3** (abort):
- Exit command

**If all tests pass**:
- "✅ All tests passing (pytest + black + ruff + mypy)"
- Proceed to Step 6

## Step 6: Commit Changes

Check if there are changes to commit:
```bash
git status --short
```

**If no changes**:
- "ℹ️ No changes to commit. Branch is already up-to-date."
- Proceed to Step 7 anyway (push existing commits)

**If changes exist**:

Generate commit message based on changes:
```bash
# Get changed files summary
git diff --stat HEAD

# Generate commit message
# Format: "checkpoint: <auto-summary of changes>"
```

Commit:
```bash
git add .
git commit -m "checkpoint: [auto-generated summary]

Checkpoint saved at $(date '+%Y-%m-%d %H:%M')
[If WIP: Add "⚠️ WIP - tests failing"]
"
```

## Step 7: Push Branch to GitHub

Push feature branch:
```bash
# Check if branch exists remotely
git ls-remote --heads origin $(git branch --show-current)

# If branch doesn't exist remotely, create it
# If exists, push update
git push origin $(git branch --show-current)
```

**Report success**:
```
✅ Checkpoint Complete

📦 Branch: [branch-name]
📊 Tests: [✅ All passing | ⚠️ WIP - tests failing]
🔄 Synced: [✅ Up-to-date with main | ⚠️ Main not merged (N commits behind)]
📤 Pushed: [N commits] to GitHub

Safe to:
- Switch sessions (local ↔ web)
- Take a break
- Continue working

Commands:
- /checkpoint - Save again later
- /wrapup - Merge to main when complete
- /switch - Work on different branch
```

---

**Usage**:
- `/checkpoint` - Run full checkpoint workflow

**When to Use**:
- Before switching sessions (local ↔ web)
- After significant progress (5-7 commits or 45-60 min work)
- Before risky operations (major refactors)
- When leaving work for later

**Important**:
- Always runs tests (ensures you don't push broken code)
- Recommends syncing with main (reduces /wrapup conflicts)
- Safe for multi-session work (handles stashing/conflicts)
- Keeps feature branches on GitHub (enables collaboration)
