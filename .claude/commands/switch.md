---
description: "Switch between feature branches with automatic stash management"
---

You are switching between branches. Follow this workflow systematically:

## Step 1: Check Current Branch Status

Check for uncommitted changes:
```bash
git status --short
```

**If uncommitted changes exist**:
```
📝 You have uncommitted changes:
[List changed files with status]

What would you like to do?
  1. Stash changes and switch (recommended)
  2. Commit changes first, then switch
  3. Discard changes and switch (⚠️ irreversible)
  4. Cancel switch

Choice: _______
```

**If user chooses 1** (stash):
```bash
git stash push -m "switch: auto-stash from $(git branch --show-current) at $(date '+%Y-%m-%d %H:%M')"
echo "✅ Changes stashed"
```

**If user chooses 2** (commit first):
```
Please commit your changes:
  git add .
  git commit -m "your message"

Then run /switch again.
```
Exit command.

**If user chooses 3** (discard):
```bash
git checkout -- .
git clean -fd
echo "⚠️ Changes discarded"
```

**If user chooses 4** (cancel):
Exit command.

**If no uncommitted changes**:
- Proceed to Step 2

## Step 2: List Available Branches

Fetch latest from remote and list all branches:

```bash
# Fetch all branches
git fetch --all

# List local feature branches with last commit info
echo "Local feature branches:"
git for-each-ref --sort=-committerdate refs/heads/ \
  --format='%(refname:short)|%(committerdate:relative)|%(subject)' \
  | grep -E '^(feature|fix|test|docs|refactor)/' \
  | head -10

# List remote branches not yet checked out locally
echo ""
echo "Remote branches (not local):"
git branch -r | grep -E 'origin/(feature|fix|test|docs|refactor)' \
  | sed 's|origin/||' \
  | while read branch; do
      if ! git show-ref --verify --quiet refs/heads/$branch; then
        echo "$branch (remote only)"
      fi
    done | head -10
```

**Present to user**:
```
Available branches:

Local Branches:
  1. feature/slack-integration (2 hours ago) - "Add Slack notification system"
  2. fix/chromadb-bug (1 day ago) - "Fix similarity calculation bug"
  3. feature/redis-caching (3 days ago) - "Add Redis caching layer"

Remote Branches (not checked out):
  4. feature/api-v2 (remote only)
  5. docs/architecture-update (remote only)

Current branch: [current-branch] ← You are here

Options:
  - Enter number to switch (1-5)
  - Enter custom branch name
  - Type 'new' to create new branch from TODO
  - Type 'cancel' to abort

Your choice: _______
```

## Step 3: Switch to Selected Branch

### If user selects local branch:

```bash
# Switch to local branch
git checkout [selected-branch]

# Pull latest changes if remote exists
git pull origin [selected-branch] 2>/dev/null || echo "No remote tracking"

# Restore stashed changes if they belong to this branch
git stash list | grep "switch: auto-stash from [selected-branch]"
```

**If matching stash found**:
```
Found stashed changes from previous session on this branch:
  [Show stash message and date]

Apply stashed changes?
  1. Yes, apply stash (recommended)
  2. No, keep stash for later
  3. Show what's in stash first

Choice: _______
```

If user chooses 1:
```bash
git stash pop
```

If conflicts:
```
⚠️ Stash conflicts with current branch state.

Conflicted files:
[List files]

Resolve conflicts manually:
  [List: vi path/to/file for each conflict]

Tell me 'resolved' when done, or 'abort' to keep stash.
```

If user chooses 3:
```bash
git stash show -p [stash-id]
```
Then re-ask apply question.

### If user selects remote-only branch:

```bash
# Check out remote branch locally
git checkout -b [branch-name] origin/[branch-name]
```

### If user enters custom branch name:

Check if branch exists:
```bash
git show-ref --verify refs/heads/[branch-name] 2>/dev/null
```

**If exists locally**: Switch to it (same as local branch workflow)

**If exists remotely**: Check out from remote (same as remote-only workflow)

**If doesn't exist**:
```
Branch '[branch-name]' doesn't exist.

Options:
  1. Create new branch with this name
  2. Try different name
  3. Cancel

Choice: _______
```

If user chooses 1:
```bash
# Create branch from current HEAD
git checkout -b [branch-name]
```

### If user types 'new':

Suggest running `/start` instead:
```
To create a new branch from TODO, use:
  /start

This will:
  - Read next TODO item
  - Auto-generate branch name
  - Set up branch and start work

Run /start now? (yes/no): _______
```

If yes: Exit and suggest `/start`
If no: Return to Step 2

## Step 4: Report Success

Show branch info:
```bash
# Current branch
git branch --show-current

# Recent commits
git log --oneline -5

# Branch status vs remote
git status -sb

# Uncommitted changes (if any)
git status --short
```

**Report**:
```
✅ Switched to: [branch-name]

📊 Branch Status:
  - Local commits: [N commits ahead of origin/branch] or [up-to-date]
  - Uncommitted changes: [N files] or [none]
  - Last commit: [commit message] ([time ago])

Recent commits:
  [Show last 3 commits]

[If stash was applied]
📝 Restored: Stashed changes from previous session

[If stash was saved on previous branch]
💾 Saved: Changes from [previous-branch] stashed for later

Next steps:
  - Continue work on this branch
  - /checkpoint to save progress
  - /switch to change branches again
  - /wrapup to merge when complete
```

## Step 5: Cleanup Check (Optional)

If many stashes exist, offer cleanup:

```bash
git stash list | wc -l
```

**If > 5 stashes**:
```
ℹ️ You have [N] stashes. Consider cleaning old ones:

Recent stashes:
[Show: git stash list | head -5]

Options:
  1. Keep all (default)
  2. Clear stashes older than 7 days
  3. Show all and manually clean

Choice (1-3, or press Enter to skip): _______
```

If user chooses 2:
```bash
# List stashes older than 7 days
git stash list --date=local | awk -F: '/stash@{7 days ago}/,0 {print $1}'

# Prompt for confirmation before dropping
```

---

**Usage**:
- `/switch` - Interactive branch switching

**When to Use**:
- Working on multiple features in parallel
- Switching between sessions (local ↔ web)
- Quick context switch between bug fix and feature work
- Reviewing different branches

**Important**:
- Auto-stashes uncommitted changes (safe switching)
- Restores stashes when returning to branch
- Syncs with remote automatically
- Shows branch status after switch

**Tip**: Use with `/checkpoint` for safe multi-branch workflow:
```
# Work on feature A
[make changes]
/checkpoint  # Saves to GitHub

# Switch to feature B
/switch
[work on feature B]
/checkpoint

# Switch back to A
/switch
[continue feature A]
```
