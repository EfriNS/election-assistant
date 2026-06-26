---
name: second-opinion
description: >
  Spawn a fresh planning agent with only the product problem and a governing constraint — no current-solution context — to get an independent architectural perspective. Use when direction feels uncertain, a plan feels engineering-first, the user questions the approach, or after a long planning session before implementation. The value is breaking session bias, not reviewing the current solution.
---

# Second Opinion

Gets a genuinely independent perspective by spawning a fresh agent that cannot see the current solution. The goal is to break session bias accumulated during deep implementation or planning work.

## When to Use

- A plan or approach feels off but it's hard to articulate why
- A planning output was proposed and the user seems uncertain or is questioning the direction
- You notice yourself defending a direction rather than evaluating it
- After any significant planning session, before starting implementation
- The user says "get a second opinion", "think from scratch", or "are we going the right direction?"

## What This Is NOT

- A review of the current solution (that would just confirm anchoring)
- A comparison of options already generated
- A verification of implementation correctness

The value is **independence from session bias**. The fresh agent must not see the current solution.

---

## Step 1: Extract the Problem and Constraint

Before spawning the agent, identify two things from context:

**A. The product problem** — what the user needs, in product/user terms. Not implementation terms.

> Example: "Follow-up questions in the political quiz probe irrelevant dimensions for some users, and free-text answers get generic responses instead of substantive dimension-driven questions."

**B. The governing constraint** — the design principle that rules out certain solution classes. This is often what the first approach violated.

> Example: "This is an AI assistant. The AI should drive the conversation and adapt to the user. Replacing AI decisions with deterministic client logic goes in the wrong direction."

If either is unclear, ask before spawning:
- "What's the core product problem, in user terms?"
- "Is there a constraint on the type of solution? (e.g., must preserve AI agency, must not add latency, must work without a backend)"

---

## Step 2: Formulate the Prompt

The prompt must include:
1. The product problem (A)
2. The governing constraint (B)
3. Minimal technical context — enough to reason about solutions, not enough to anchor on the current approach (file names, key types, data flow)
4. A request for product impact first, then design principle, then implementation
5. An explicit instruction: "Propose what you would do from scratch. Do not ask what the current solution is."

Template:

```
You are a software architect doing a fresh design review. No prior solution context.

**Product problem:**
[A]

**Governing constraint:**
[B]

**Technical context** (for grounding only — not a description of the current solution):
[Key files, types, data flow — the minimum needed to reason about the problem]

**Task:**
Propose an architecture or implementation approach. Structure your answer as:
1. Product impact: what changes for the user? (user journey, satisfaction, what's better/worse)
2. Design principle: what governs your approach given the constraint above?
3. Implementation: what specifically changes in the code?

Do NOT ask what the current solution is. Propose what you would do from scratch.
```

---

## Step 3: Spawn the Fresh Agent

Use the `Plan` subagent type. Do **NOT** use `fork` — a fork inherits the full session context, defeating the purpose entirely.

```
Agent({
  subagent_type: "Plan",
  name: "second-opinion",
  description: "Independent architecture review — no prior solution context",
  prompt: [prompt from Step 2]
})
```

---

## Step 4: Present the Comparison

When the agent returns, surface the comparison:

**Converged** (fresh agent arrived at similar approach):
> "The independent agent reached the same direction. Confidence in the current approach is higher."

**Diverged** (fresh agent proposed something different):
> "The independent agent proposed [X]. Key difference from current direction: [Y]. This is worth examining before proceeding — the divergence point often reveals a hidden assumption or constraint that wasn't surfaced."

Ask the user: "Does this change anything, or does the convergence increase your confidence?"

---

## Reference Example (from the session that produced this skill)

**Problem**: Follow-up questions in a political quiz were probing wrong dimensions and giving generic responses for free-text opener answers.

**Constraint**: "We are building an AI assistant — the direction of the follow-up question *should* be influenced by the AI. Solutions that replace AI decisions with deterministic client logic go in the wrong direction."

**Technical context given**: The quiz architecture — `callFollowUpAPI`, `TOPIC_KEY_DIMENSIONS`, party grounding files, `topicQA` state shape.

**What the fresh agent produced** (without knowing the current solution): A `suggestedNextDimension` field computed client-side and sent to the AI as a named suggestion — not a mandate. The AI retains discretion to probe a different dimension if the user's answers clearly indicate it. Grounding data filtered to close-matching parties only.

**Signal**: Converged with the correct solution. Confirmed direction before implementation began.

---

## Note on Scope

This skill is universal — it applies to any project or domain. If you find yourself using it frequently across projects, consider moving it to `~/.claude/skills/second-opinion/` so it's available globally.
