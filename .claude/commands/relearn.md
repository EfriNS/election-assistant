---
description: "Re-read core context files after context compaction"
---

You need to refresh your knowledge after context has compacted. Follow this workflow systematically:

## Purpose

This command restores critical context that may have been lost during automatic context compaction. It re-reads the essential files that define how you work on this project.

## Step 1: Re-read Core Context Files

Read these files **in order** to refresh context:

1. **`CLAUDE.md`** - Project guidelines, architecture, workflow, testing requirements
2. **`docs/learnings/INDEX.md`** - Quick learning reference hub (Top 10 principles)
3. **`REQUIREMENTS.md`** - Complete product requirements and vision

**Purpose**: These files exist for YOU (Claude Code) to consume and apply. They change your behavior during task execution.

## Step 2: Identify Active Work Context from Conversation

Look at the recent conversation history to understand:
- What task were we working on before context compacted?
- What files were we modifying?
- What phase are we in (planning, implementing, testing)?
- Is there a `docs/*.md` design doc referenced (e.g. `docs/PHASED-ROADMAP.md`, `docs/ANALYTICS-DESIGN.md`)?

**If conversation history is unclear**, check these in order:
1. `git status` - What files are currently modified?
2. `git log -5 --oneline` - Recent commits show recent work
3. `git branch --show-current` - Branch name often indicates task
4. `TODO.md` - Current priorities (if still unclear)
5. `CHANGELOG.md` - Recent completed work (context clues)

## Step 3: Load Relevant Learning Files

Based on the type of work identified in Step 2, read the relevant learning topic files:

- **Testing/QA tasks** → Read `docs/learnings/universal/TESTING.md`, then check `project/TESTING-PATTERNS.md` if exists
- **CI/CD or deployment** → Read `docs/learnings/universal/CI-CD.md`, then check `project/` for specifics
- **Architecture/design decisions** → Read `docs/learnings/universal/ARCHITECTURE.md`, then check `project/` for specifics
- **Debugging issues** → Read `docs/learnings/universal/DEBUGGING.md`, then check `project/` for specifics
- **Process/workflow improvements** → Read `docs/learnings/universal/PROCESS.md`
- **AI prompt modifications** → Read `docs/learnings/universal/AI-PROMPTS.md`

**Priority**: Universal learnings first (foundational principles), then project-specific patterns (implementations).

If current work doesn't clearly map to a topic, skip this step (INDEX.md is sufficient).

## Step 4: Read Active Design Doc (If Applicable)

If the conversation or git branch indicates we're working on an item with a dedicated design doc (e.g., branch name `feature/analytics-dashboards` → `docs/MIXPANEL-DASHBOARDS.md`), read that file to understand:
- Detailed requirements
- Implementation plan
- Context and rationale
- Any specific instructions or constraints

## Step 5: Confirm Re-Learning

After reading all files, provide a concise summary:

```
✅ **Context Refreshed**

📖 Core Files Read:
- CLAUDE.md - [1-2 key principles remembered]
- INDEX.md - [1-2 key learnings referenced]
- REQUIREMENTS.md - [Product vision confirmed]

🎯 Current Work Context (from conversation/git):
- Branch: [current branch name]
- Working On: [identified from conversation or git context]
- Active Files: [modified files from git status]

🧠 Relevant Learnings Applied:
- [List 2-3 key principles from topic files that apply to current work]

💡 Ready to continue work on: [brief description of current task]
```

---

## When to Use This Command

**Trigger `/relearn` when:**
- You notice Claude has "forgotten" project context
- After automatic context compaction (token usage resets to 0%)
- Claude violates a principle from CLAUDE.md
- Starting a new session after a long break
- Claude doesn't recognize project-specific patterns
- User explicitly notices knowledge loss

**Automatic triggers** (user should run `/relearn`):
- Claude suggests creating files that already exist
- Claude asks questions answered in REQUIREMENTS.md
- Claude violates testing/workflow guidelines from learnings
- Claude doesn't follow the branching workflow

---

## Important Notes

- This command is **read-only** - it doesn't modify files or create branches
- Use `/start` if you need to begin work on a new TODO item (includes branching)
- If recovering from a crash, use Claude Code's native session resume (`claude --resume`/`--continue`) — it restores the full conversation transcript
- This command is lightweight - safe to run multiple times per session
- **Continue current work** - don't look for "next task" in TODO.md
