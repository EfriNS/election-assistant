---
description: "Re-read context and handle top TODO item"
argument-hint: "[optional: specific TODO item or file path to start with]"
---

You are starting a new development session. Follow this workflow systematically:

## Step 0: Branch Management (Auto-Branching)

Check current Git branch and create feature branch if needed:

```bash
git branch --show-current
```

### If Currently on Main Branch:

**Read TODO.md** to identify the target item (see Step 2 for details on selection).

**Extract branch name from TODO item**:
- Remove common prefixes: "Add", "Fix", "Update", "Implement", "Create", "Build"
- Convert to slug: lowercase, spaces to dashes, remove special chars
- Determine prefix:
  - `fix/` - if contains: "fix", "bug", "error", "issue"
  - `test/` - if contains: "test", "coverage"
  - `docs/` - if contains: "doc", "readme", "comment"
  - `refactor/` - if contains: "refactor", "cleanup", "reorganize"
  - `feature/` - everything else (default)

**Validation**:
- Slug length > 40 chars → Prompt user for shorter name
- Slug length < 3 chars → Prompt user for descriptive name
- TODO contains '+' or '&' (multiple tasks) → Prompt user to choose

**Example Extractions**:
- "Add Slack integration" → `feature/slack-integration`
- "Fix ChromaDB similarity bug" → `fix/chromadb-similarity-bug`
- "Update API documentation" → `docs/api-documentation`
- "Fix timeout bug + Add tests" → Prompt user (multiple tasks)

**Prompting Examples**:

*Too long:*
```
Suggested branch name is too long (>40 chars):
  fix/chromadb-similarity-calculation-bug-and-regression-tests

Please provide shorter name:
  Suggestions:
  - fix/chromadb-similarity
  - fix/chromadb-bug
  - fix/similarity-calculation

Enter name (without prefix): _______
```

*Multiple tasks:*
```
TODO contains multiple tasks:
  "Add Redis caching + Update API docs + Fix timeout bug"

Which task for this branch?
  1. Redis caching → feature/redis-caching
  2. API docs → docs/api-updates
  3. Timeout bug → fix/timeout-bug
  4. Custom name: _______

Choice: _______
```

**Create branch**:
```bash
# Create and checkout new branch
git checkout -b [prefix/slug]

# Report
echo "✅ Created branch: [prefix/slug]"
```

### If Currently on Feature Branch:

Check if branch has uncommitted or unpushed work:

```bash
# Check for uncommitted changes
git status --short

# Check if branch exists remotely
git ls-remote --heads origin $(git branch --show-current)

# Check for unpushed commits
git rev-list --count origin/$(git branch --show-current)..HEAD 2>/dev/null || echo "0"
```

**Ask user**:
```
You're currently on: [current-branch-name]

Status:
- Uncommitted changes: [Yes/No - list changed files if yes]
- Unpushed commits: [N commits]
- Remote branch: [Exists/Not pushed yet]

What would you like to do?
  1. Continue on [current-branch-name] (current TODO item)
  2. Start new feature (will switch branches)
  3. Switch to existing branch (see /switch command)
  4. Checkpoint current work first (/checkpoint then start new)

Active branches:
[List all local feature/* fix/* branches with last commit date]

Choice: _______
```

**If user chooses 1**: Skip branch creation, proceed to Step 1
**If user chooses 2**: Follow branch creation workflow above (prompt for TODO item if needed)
**If user chooses 3**: Suggest using `/switch` command instead
**If user chooses 4**: Suggest running `/checkpoint` first, then `/start` again

### Edge Cases:

**Branch already exists locally**:
```bash
git show-ref --verify refs/heads/[branch-name]
```
If exists:
```
Branch [branch-name] already exists locally.

  1. Switch to existing branch (continue previous work)
  2. Create new branch with different name
  3. Delete old branch and recreate (⚠️ loses history)

Choice: _______
```

**Main has diverged since last pull**:
```bash
git fetch origin main
git rev-list --count HEAD..origin/main
```
If main is ahead:
```
⚠️ Your local main is [N] commits behind origin/main.

Update main before branching?
  1. Yes, update main first (recommended)
  2. No, branch from current main (may cause conflicts later)

Choice: _______
```

If user chooses 1:
```bash
git checkout main
git pull --ff-only origin main
git checkout -b [branch-name]
```

## Step 1: Re-read Context Files
Read these files to refresh context:
1. `CLAUDE.md` - Project guidelines and architecture
2. `docs/learnings/INDEX.md` - Quick learning reference hub
3. `product/REQUIREMENTS.md` - the whole product requirements

**Purpose**: These learnings exist for YOU (Claude Code) to consume and apply.
They change your behavior during task execution.

After reading, briefly acknowledge key principles you'll apply.

## Step 2: Identify Target TODO Item & Load Relevant Learning

**If argument provided:**
Look for the specified item in `TODO.md` or check if the argument is a file path (e.g., "backlog/E2E-FIX-ALL-TESTS.md"). If it's a file path, read that file instead.

**If no argument provided:**
Read `TODO.md` and identify the highest priority uncompleted item.

Look for:
- Items marked `[ ]` (uncompleted)
- Items in the "🎯 HIGH PRIORITY" section first
- The topmost uncompleted item in priority order

Based on the TODO item type, optionally read the relevant learning topic:
- Testing/QA tasks? → Read `docs/learnings/universal/TESTING.md`, then check `project/TESTING-PATTERNS.md` if exists
- CI/CD or deployment? → Read `docs/learnings/universal/CI-CD.md`, then check `project/` for specifics
- Architecture/design decisions? → Read `docs/learnings/universal/ARCHITECTURE.md`, then check `project/` for specifics
- Debugging issues? → Read `docs/learnings/universal/DEBUGGING.md`, then check `project/` for specifics
- Process/workflow improvements? → Read `docs/learnings/universal/PROCESS.md`
- AI prompt modifications? → Read `docs/learnings/universal/AI-PROMPTS.md`

**Priority**: Universal learnings first (foundational principles), then project patterns (specific implementations).

If TODO item doesn't clearly map to a topic, just use INDEX.md.

## Step 3: Analyze Planning Needs
Determine if the target item requires planning:

**Requires Planning (use planner agent)**:
- Implementing new features
- Architectural changes
- Multi-step tasks with dependencies
- Tasks marked with "Details:" sections requiring comprehensive analysis
- Tasks involving "design", "implement", "add", "create", "build"

**Direct Execution (no planning needed)**:
- Simple bug fixes with clear solution
- Documentation updates
- Testing existing functionality
- Configuration changes
- Single-file modifications
- Backlog item execution (items in backlog/ directory)

## Step 4: Execute or Plan
Based on Step 3 analysis:

### If Planning Required:
Invoke the **planner agent** with:
```
Task: Plan implementation for [item name]

Context:
- Item: [full description from TODO.md or backlog file]
- Details Section: [include relevant DETAILS section if exists]
- Priority: [HIGH/MEDIUM/FUTURE]

Requirements:
- Create comprehensive implementation plan
- Break down into phases with time estimates
- Identify files to modify
- Note any architectural considerations from CLAUDE.md
- Consider security, testing, and documentation needs

Return:
Detailed implementation plan ready for user approval
```

### If Direct Execution:
Start working on the task immediately:
1. Use TodoWrite tool to track sub-tasks if needed
2. Follow CLAUDE.md guidelines
3. Keep user informed of progress
4. Ask clarifying questions if needed

## Step 5: Present to User
Provide clear summary:
```
🚀 **Session Started**

🌿 Branch: [branch-name] ([new/existing] feature branch)

📖 Context Refreshed:
- [Key architectural principles from CLAUDE.md]
- [Relevant learnings from INDEX.md, universal/ and project/ files read]

🎯 Target Item:
[Item name and description - from TODO.md top priority OR from specified argument]

📋 Action Plan:
[Either "Invoking planner agent for comprehensive planning" OR "Starting direct implementation"]

💡 Tip: Use /checkpoint to save progress and sync with main
```

---

**Usage Examples**:
- `/start` - Works on highest priority uncompleted item in TODO.md
- `/start Execute the E2E fix plan in backlog/E2E-FIX-ALL-TESTS.md` - Works on specified backlog file
- `/start some-todo-item-name` - Works on TODO.md item matching that name

**Important Guidelines**:
- ALWAYS read CLAUDE.md and docs/learnings/INDEX.md first
- Read relevant topic file from docs/learnings/ if item maps to specific area
- If argument provided and it's a file path, read that file; otherwise search TODO.md for matching item
- Use planner agent for complex tasks - don't guess at implementation
- Ask user for clarification if item is ambiguous
- Follow all architectural guidelines from CLAUDE.md
