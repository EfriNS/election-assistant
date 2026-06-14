---
description: "Save complete session state for crash recovery"
---

You need to capture the complete session state so a new Claude instance can continue from where you left off. This is critical for crash recovery.

## Step 1: Gather Current Session State

Collect all relevant information:
1. **Active TODO List**: Your current internal todo list state (all items with their statuses)
2. **Context Understanding**: What you currently understand about:
   - The user's current goal/task
   - What phase of work you're in
   - What's been completed so far this session
   - What's in progress
   - What's blocked or has issues
3. **File Changes**: What files you've modified this session (not yet committed)
4. **Key Decisions**: Important decisions or constraints discovered during work
5. **Current Problems**: Any errors, blockers, or issues you're working through
6. **Next Steps**: What you were planning to do next

## Step 2: Read Existing Documentation

Read these files to understand the persisted state:
- `TODO.md` - Long-term task tracking
- `CHANGELOG.md` - Completed work history
- Recent git status and uncommitted changes

## Step 3: Create Comprehensive SAVED.md

Write to `ops/SAVED.md` with this structure:

```markdown
# SESSION STATE SNAPSHOT
**Saved:** [ISO timestamp]
**Session Duration:** [approximate duration]

## 🎯 Current Mission
[One clear sentence: What is the user trying to accomplish RIGHT NOW?]

### Session Context
- **Started with:** [What was the initial request this session?]
- **Current phase:** [Planning / Implementing / Debugging / Testing / Documenting]
- **Progress:** [X% complete, or description of progress]

## ✅ Completed This Session
[Bulleted list of what's been accomplished, with file references]
- Item 1 (file.ts:123)
- Item 2 (file.tsx:456)

## 🔄 Currently In Progress
[What you're actively working on RIGHT NOW]
- **Active task:** [Description]
- **Status:** [Detailed status - what step you're on]
- **Files being modified:** [List with line numbers if relevant]
- **Approach:** [The approach/strategy you're using]

## 📋 Active TODO List
[Your current internal TodoWrite state - ALL items with statuses]
- [ ] Pending task 1
- [→] In progress task (CURRENT: this is where we are)
- [✓] Completed task 1
- [✓] Completed task 2

## 🚧 Blockers & Issues
[Any errors, problems, or decisions needed]
- **Blocker 1:** [Description and what you've tried]
- **Issue 2:** [Description and potential solutions]
- **Needs decision:** [Questions for user]

## 🗂️ Modified Files (Uncommitted)
[Output of git status for context]
```
[Paste git status output]
```

## 🧠 Key Insights & Decisions
[Important things discovered this session that aren't obvious from code]
- **Decision:** [Why you chose approach X over Y]
- **Discovery:** [Important insight about codebase]
- **Constraint:** [Limitation or requirement learned]

## 📍 Next Steps
[Ordered list of what to do next - be VERY specific]
1. [Exact next action with file/function references]
2. [Following action]
3. [Alternative if #1 is blocked]

## 🔧 Working Context
- **Working directory:** [Current directory]
- **Git branch:** [Current branch]
- **Dev server:** [Running? On what port?]
- **Open terminals:** [What's running in background if anything]

## 💡 Meta-Notes for Continuation
[Advice to your future self / next Claude instance]
- Remember to [important thing to not forget]
- Watch out for [gotcha or quirk discovered]
- User prefers [preference learned]
```

## Step 4: Verify Save Completeness

Check that ops/SAVED.md includes:
- ✅ Clear current mission statement
- ✅ Active TODO list state
- ✅ In-progress work details
- ✅ Any blockers or errors
- ✅ Specific next steps
- ✅ Git status / uncommitted changes
- ✅ Key decisions and context

## Step 5: Confirm to User

Report back:
```
💾 **Session State Saved**

📄 Saved to: ops/SAVED.md
🕐 Timestamp: [ISO timestamp]

**Captured:**
- ✅ Current mission: [one-line summary]
- ✅ Active TODOs: [X items - Y in progress]
- ✅ Modified files: [count]
- ✅ Next steps: [count] actions ready
- ✅ Blockers: [count if any]

**Recovery Instructions:**
If this session crashes, run `/continue` in a new Claude instance to restore full context and resume work seamlessly.
```

---

**Important Guidelines**:
- Be EXTREMELY detailed - assume total context loss
- Include line numbers and specific function names
- Capture your internal state, not just file state
- Make next steps actionable and specific
- Include git status for uncommitted changes
- Save your thought process and reasoning
- Don't just describe files - describe your UNDERSTANDING
