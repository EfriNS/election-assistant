---
description: "Restore session state and continue work after crash"
---

You are a NEW Claude instance recovering from a crash. Your goal is to seamlessly continue the previous session's work with minimal interruption.

## Step 1: Load Project Guidelines

Read the core project documentation:
1. `CLAUDE.md` - Project architecture, guidelines, and workflows
2. `docs/learnings/INDEX.md` - Quick learning reference hub

After reading, briefly acknowledge the key architectural principles you must follow.

## Step 2: Load Session State

Read the saved session state:
- `ops/SAVED.md` - Complete session snapshot from previous instance

This file contains:
- The current mission and goal
- Active TODO list state
- In-progress work details
- Blockers and issues
- Next steps
- Key decisions and context

## Step 3: Verify Environment State

Check the current environment matches the saved state:
```bash
# Check git status
git status

# Check current branch
git branch --show-current

# Check for uncommitted changes
git diff --stat
```

Compare with what ops/SAVED.md indicates. Note any discrepancies.

## Step 4: Restore Internal TODO List

Use TodoWrite tool to recreate the exact TODO list state from ops/SAVED.md:
- Restore all items with their exact statuses (pending/in_progress/completed)
- Maintain the order and structure
- Mark the current in-progress item correctly

## Step 5: Assess Continuation Point

Determine exactly where to continue:
- **If work was in-progress:** Read the files being modified to understand current state
- **If there were blockers:** Understand what was blocking progress
- **If errors existed:** Check if they're still present
- **Next steps:** Review the ordered next steps from ops/SAVED.md

## Step 6: Present Continuity Report

Provide clear, confident summary showing you understand the context:
```
🔄 **Session Restored from Crash**

📖 Context Loaded:
- ✅ Project guidelines (CLAUDE.md)
- ✅ Past learnings (docs/learnings/INDEX.md)
- ✅ Session state (ops/SAVED.md from [timestamp])

🎯 Current Mission:
[One clear sentence from ops/SAVED.md]

📊 Session Recovery:
- **Progress:** [X% or description]
- **Completed:** [count] tasks
- **In Progress:** [current task description]
- **Blockers:** [count and brief list if any]

🔧 Environment Status:
- Branch: [branch name]
- Modified files: [count]
- [Note any discrepancies from expected state]

📋 Restored TODO List:
[Brief summary - X pending, Y in progress, Z completed]

▶️ Continuing from:
[The exact action you're about to take - be specific with file:line references]

Ready to continue. [Ask user if they want you to proceed or if priorities have changed]
```

## Step 7: Resume Work

Based on the next steps in ops/SAVED.md:
- Continue with the in-progress task if it was mid-execution
- Or start the next pending task if previous was just completed
- Or address blockers if they were documented
- **Ask user for confirmation before proceeding if there's any ambiguity**

## Step 8: Clean Up Session State

After successfully restoring and presenting the continuity report, delete the SAVED.md file:

```bash
rm ops/SAVED.md
```

**Rationale**:
- Session state has been restored to your internal context
- File is no longer needed and could cause confusion in git operations
- If another `/save` is needed, it will create a fresh snapshot
- Prevents stale state from being accidentally used in future `/continue` commands

Report to user:
```
🧹 Cleaned up ops/SAVED.md (session state restored, file no longer needed)
```

---

**Important Guidelines**:
- ALWAYS read CLAUDE.md, docs/learnings/INDEX.md, and ops/SAVED.md in that order
- Optionally read relevant topic files if saved work suggests specific area:
  * Universal learnings in `docs/learnings/universal/`
  * Project patterns in `docs/learnings/project/` (if exists)
- Restore the EXACT todo list state - don't restart from scratch
- Check for environment discrepancies (uncommitted changes, etc.)
- Be transparent about what you understand and what's unclear
- Ask user for clarification if ops/SAVED.md is ambiguous or stale
- Don't assume - verify the current state matches saved state
- Acknowledge if significant time has passed (saved state might be outdated)
- Follow all architectural guidelines from CLAUDE.md
- Trust the previous instance's decisions and context unless there's clear reason not to

**Red Flags to Check:**
- ⚠️ ops/SAVED.md timestamp is very old (>24 hours)
- ⚠️ Git state doesn't match ops/SAVED.md (files missing, different branch)
- ⚠️ Multiple conflicting items marked "in_progress"
- ⚠️ Next steps reference files that don't exist
- ⚠️ Blockers mention external dependencies (user input needed)

If you encounter red flags, report them and ask user for guidance before proceeding.
