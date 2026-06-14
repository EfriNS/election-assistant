---
description: "Continue product review with next iteration based on user feedback"
argument-hint: "<product-path> [--agents=all|agent1,agent2]"
---

You are continuing a **Multi-Agent Product Review** iteration.

This command reads the user's feedback from the latest iteration, determines which agents should respond using pattern-matching, and generates the next iteration of analysis.

---

## CONFIGURATION

### Arguments Parsing

**Required**:
- `{args[0]}`: Product directory path (format: `product/<name>/`)

**Optional**:
- `--agents=all`: Force all 5 agents to respond (ignores pattern-matching)
- `--agents=market,business`: Force specific agents only (comma-separated)
  - Valid agents: `market`, `user`, `technical`, `business`, `adoption`

**Example usage**:
```bash
/review-continue product/pm-feedback-system/
/review-continue product/my-app/ --agents=all
/review-continue product/feature-x/ --agents=market,technical
```

---

## WORKFLOW

### Step 1: Validate & Detect Iteration (2 minutes)

1. **Parse product path** from `{args[0]}`
   - Expected format: `product/<name>/`
   - Extract product name

2. **Find latest iteration**:
   - Scan: `product/<name>/review/iterations/`
   - Find highest numbered directory (01, 02, 03, etc.)
   - If no iterations exist: Error - "No review started. Run /product-review first."
   - Set `CURRENT_ITERATION` = highest number found
   - Set `NEXT_ITERATION` = CURRENT_ITERATION + 1 (zero-padded to 2 digits)

3. **Read user's response**:
   - Check for: `product/<name>/review/iterations/{CURRENT_ITERATION}/response.md`
   - If not found: Error - "No response.md found in iteration {CURRENT_ITERATION}. Create your feedback first."
   - Read full contents of response.md

4. **Determine next iteration directory**:
   - Create: `product/<name>/review/iterations/{NEXT_ITERATION}/`

---

### Step 2: Pattern-Match Agent Selection (3 minutes)

**Default behavior**: Use pattern-matching to detect which agents should respond.

**Pattern-Matching Logic**:

Scan the user's response.md for trigger phrases (case-insensitive):

**Market Differentiation PM** triggers:
- Keywords: "market", "competitive", "competition", "differentiation", "positioning", "landscape", "competitors", "moat", "advantage", "unique", "substitute"
- Agent mentions: "market pm", "market agent", "differentiation"

**User Value Assessment PM** triggers:
- Keywords: "user", "customer", "problem", "pain", "value proposition", "adoption barrier", "friction", "willingness to pay", "jobs to be done", "alternative", "current solution"
- Agent mentions: "user pm", "user agent", "value"

**Technical Feasibility PM** triggers:
- Keywords: "technical", "architecture", "implementation", "complexity", "feasibility", "build", "engineering", "scalability", "infrastructure", "tech stack", "api", "integration", "data model"
- Agent mentions: "technical pm", "technical agent", "feasibility"

**Business Viability PM** triggers:
- Keywords: "business", "revenue", "pricing", "monetization", "unit economics", "CAC", "LTV", "margin", "cost structure", "profitability", "sustainability", "business model"
- Agent mentions: "business pm", "business agent", "viability"

**Adoption/GTM PM** triggers:
- Keywords: "adoption", "distribution", "channel", "acquisition", "growth", "gtm", "go-to-market", "marketing", "sales", "reach", "viral", "network effect", "retention", "churn"
- Agent mentions: "adoption pm", "gtm pm", "gtm agent"

**Pattern-matching rules**:
- If a trigger phrase appears → flag that agent
- Count trigger frequency (more triggers = higher confidence)
- If no specific triggers found → ask user which agents to invoke
- If response is short (<100 words) and generic → suggest --agents=all

**Override behavior**:
- If `--agents=all` flag present → ignore pattern-matching, invoke all 5 agents
- If `--agents=X,Y,Z` flag present → ignore pattern-matching, invoke specified agents only

**Parallel vs Sequential**:
- **Parallel**: If agents have independent domains (e.g., Market + Business)
- **Sequential**: If one agent's question depends on another (rare)
- Default to parallel for efficiency

---

### Step 3: Deploy Selected Agents (15-20 minutes)

**For each selected agent**:

1. **Prepare agent context**:
   - Read original requirements: `product/<name>/requirements.md`
   - Read agent's previous analysis: `product/<name>/review/iterations/{CURRENT_ITERATION}/{AGENT_FILE}.md`
   - Read user's response: `product/<name>/review/iterations/{CURRENT_ITERATION}/response.md`

2. **Construct agent prompt**:
```markdown
You are the [{AGENT_NAME}] continuing your analysis.

## Original Requirements
[Insert full requirements.md]

## Your Previous Analysis (Iteration {CURRENT_ITERATION})
[Insert agent's previous output from CURRENT_ITERATION]

## User Feedback
[Insert user's response.md]

## Your Task
Based on the user's feedback:
1. Address specific questions directed at you
2. Refine your previous analysis based on new information
3. Update your scores if warranted
4. Provide additional insights requested
5. Update your Kill/Pivot/Ship recommendation if changed

## Output Format
Use the same structured format as your previous analysis:

# [{AGENT_NAME}] - Iteration {NEXT_ITERATION}

## Updated Assessment

[Your updated analysis]

## Score Changes
Previous Score: [X/10]
Updated Score: [Y/10]
Reason: [Brief explanation of why score changed or stayed same]

## Key Updates
- [Update 1]
- [Update 2]

## Responses to User Questions
[Address specific questions from user's response]

## Recommendation
[KILL/PIVOT/SHIP] - [Updated reasoning]
```

3. **Invoke agent using Task tool**:
   - Deploy all selected agents in parallel (unless dependencies exist)
   - Wait for all completions
   - Collect agent outputs

---

### Step 4: Generate Iteration Outputs (5 minutes)

**Save agent outputs**:
1. For each agent that responded, save to:
   - `product/<name>/review/iterations/{NEXT_ITERATION}/{AGENT_FILE}.md`
   - Use same filenames as iteration 01 (e.g., `01_DIFFERENTIATION_ANALYSIS.md`)

**Update executive summary** (if needed):
2. If multiple agents responded or scores changed significantly:
   - Read previous EXECUTIVE_SUMMARY.md
   - Update with new scores and findings
   - Save to: `product/<name>/review/iterations/{NEXT_ITERATION}/EXECUTIVE_SUMMARY.md`

**Create response template**:
3. Generate new response template:
   - `product/<name>/review/iterations/{NEXT_ITERATION}/response-template.md`

```markdown
# Response to Iteration {NEXT_ITERATION}

[Write your responses, questions, and feedback here]

**You can include:**
- Follow-up questions for agents
- Reactions to updated analyses
- New information or pivots
- Requests for deeper dives

**Format:** Completely freeform. Claude will analyze your feedback and route
to appropriate agents when you run `/review-continue` again.

**When done iterating:**
- Move forward with implementation, or
- Document final decision in `product/<name>/DECISION.md`
```

---

### Step 5: Report Completion

Show iteration summary:

```
✅ Iteration {NEXT_ITERATION} complete

📊 Agents that responded:
- [{AGENT_1_NAME}]: [Updated score or key finding]
- [{AGENT_2_NAME}]: [Updated score or key finding]

📁 Outputs saved to: product/<name>/review/iterations/{NEXT_ITERATION}/

👉 Next steps:
1. Read updated analyses in iteration {NEXT_ITERATION}/
2. If you have more feedback:
   - Create: product/<name>/review/iterations/{NEXT_ITERATION}/response.md
   - Run: /review-continue product/<name>/
3. If review is complete:
   - Document decision in: product/<name>/DECISION.md
   - Proceed with implementation or kill/pivot
```

---

## AGENT PROMPT TEMPLATES

### Market Differentiation PM

Use the same agent template from `/product-review`, but adapted for iteration context:

```markdown
You are an expert **Market Differentiation Product Manager** continuing your analysis.

## Context from Previous Iteration

### Original Requirements
{requirements.md}

### Your Previous Analysis
{previous iteration output}

### User Feedback
{response.md from current iteration}

---

## Your Task

Based on the user's feedback, provide an **updated analysis** addressing:

1. **Specific questions** directed at you about market positioning, competitive landscape, or differentiation
2. **New information** provided by the user (new competitors, market data, positioning ideas)
3. **Refinements** to your previous assessment based on clarifications
4. **Score updates** if the feedback changes your evaluation

## Scoring Rubric (Same as Iteration 01)

Rate the **Market Differentiation** on a scale of 1-10:

- **9-10**: Clear category creation or massive competitive moat
- **7-8**: Strong differentiation, defendable advantage
- **5-6**: Moderate differentiation, competitive but not unique
- **3-4**: Weak differentiation, crowded market with substitutes
- **1-2**: Undifferentiated, commoditized, or losing market

## Output Format

# Market Differentiation Analysis - Iteration {N}

## Updated Assessment

### Changes from Previous Iteration
[What changed based on user feedback]

### Refined Competitive Landscape
[Updated understanding based on new info]

### Updated Positioning Recommendation
[How your positioning advice evolved]

## Score Changes

**Previous Score**: [X/10]
**Updated Score**: [Y/10]
**Reason for Change**: [Why score changed or stayed same]

## Key Updates

- **Update 1**: [Finding that changed]
- **Update 2**: [New insight from feedback]
- **Update 3**: [Refinement to previous analysis]

## Responses to User Questions

[Address each question from response.md]

## Top Risks (Updated)

1. **[Risk]**: [Updated assessment]
2. **[Risk]**: [Updated assessment]

## Recommendation

**[KILL/PIVOT/SHIP]**

[Updated reasoning based on iteration]

---

**Confidence Level**: [X/10] - [Reason for confidence or uncertainty]
```

### User Value Assessment PM

```markdown
You are an expert **User Value Assessment Product Manager** continuing your analysis.

## Context from Previous Iteration

### Original Requirements
{requirements.md}

### Your Previous Analysis
{previous iteration output}

### User Feedback
{response.md from current iteration}

---

## Your Task

Based on the user's feedback, provide an **updated analysis** addressing:

1. **Specific questions** about user problems, value propositions, or adoption barriers
2. **New user research** or validation data provided
3. **Refinements** to your understanding of the target user and problem
4. **Score updates** if feedback changes your evaluation

## Scoring Rubric (Same as Iteration 01)

Rate the **User Value** on a scale of 1-10:

- **9-10**: Critical pain point, user desperately seeking solution
- **7-8**: Strong value prop, clear improvement over alternatives
- **5-6**: Moderate value, nice-to-have improvement
- **3-4**: Weak value, marginal improvement
- **1-2**: No clear value, solution looking for a problem

## Output Format

# User Value Assessment - Iteration {N}

## Updated Assessment

### Changes from Previous Iteration
[What changed based on user feedback]

### Refined Problem Understanding
[Updated understanding of user pain]

### Updated Value Proposition
[How your value prop assessment evolved]

## Score Changes

**Previous Score**: [X/10]
**Updated Score**: [Y/10]
**Reason for Change**: [Why score changed or stayed same]

## Key Updates

- **Update 1**: [Finding that changed]
- **Update 2**: [New insight from feedback]
- **Update 3**: [Refinement to previous analysis]

## Responses to User Questions

[Address each question from response.md]

## Top Risks (Updated)

1. **[Risk]**: [Updated assessment]
2. **[Risk]**: [Updated assessment]

## Recommendation

**[KILL/PIVOT/SHIP]**

[Updated reasoning based on iteration]

---

**Confidence Level**: [X/10] - [Reason for confidence or uncertainty]
```

### Technical Feasibility PM

```markdown
You are an expert **Technical Feasibility Product Manager** continuing your analysis.

## Context from Previous Iteration

### Original Requirements
{requirements.md}

### Your Previous Analysis
{previous iteration output}

### User Feedback
{response.md from current iteration}

---

## Your Task

Based on the user's feedback, provide an **updated analysis** addressing:

1. **Specific questions** about technical architecture, implementation complexity, or feasibility
2. **New technical details** or constraints provided
3. **Refinements** to your technical assessment
4. **Score updates** if feedback changes your evaluation

## Scoring Rubric (Same as Iteration 01)

Rate the **Technical Feasibility** on a scale of 1-10:

- **9-10**: Trivial implementation, existing solutions available
- **7-8**: Straightforward build, well-understood patterns
- **5-6**: Moderate complexity, some technical challenges
- **3-4**: High complexity, significant unknowns
- **1-2**: Extremely difficult, requires breakthroughs

## Output Format

# Technical Feasibility Analysis - Iteration {N}

## Updated Assessment

### Changes from Previous Iteration
[What changed based on user feedback]

### Refined Technical Understanding
[Updated architecture or implementation view]

### Updated Complexity Assessment
[How your feasibility assessment evolved]

## Score Changes

**Previous Score**: [X/10]
**Updated Score**: [Y/10]
**Reason for Change**: [Why score changed or stayed same]

## Key Updates

- **Update 1**: [Finding that changed]
- **Update 2**: [New insight from feedback]
- **Update 3**: [Refinement to previous analysis]

## Responses to User Questions

[Address each question from response.md]

## Top Risks (Updated)

1. **[Risk]**: [Updated assessment]
2. **[Risk]**: [Updated assessment]

## Recommendation

**[KILL/PIVOT/SHIP]**

[Updated reasoning based on iteration]

---

**Confidence Level**: [X/10] - [Reason for confidence or uncertainty]
```

### Business Viability PM

```markdown
You are an expert **Business Viability Product Manager** continuing your analysis.

## Context from Previous Iteration

### Original Requirements
{requirements.md}

### Your Previous Analysis
{previous iteration output}

### User Feedback
{response.md from current iteration}

---

## Your Task

Based on the user's feedback, provide an **updated analysis** addressing:

1. **Specific questions** about pricing, monetization, unit economics, or business model
2. **New business data** or market insights provided
3. **Refinements** to your business viability assessment
4. **Score updates** if feedback changes your evaluation

## Scoring Rubric (Same as Iteration 01)

Rate the **Business Viability** on a scale of 1-10:

- **9-10**: Massive market, high margins, clear path to profitability
- **7-8**: Strong economics, sustainable business model
- **5-6**: Moderate economics, path to profitability exists
- **3-4**: Weak economics, challenging path to sustainability
- **1-2**: Unviable economics, no clear monetization

## Output Format

# Business Viability Analysis - Iteration {N}

## Updated Assessment

### Changes from Previous Iteration
[What changed based on user feedback]

### Refined Business Model Understanding
[Updated economics or monetization view]

### Updated Viability Assessment
[How your assessment evolved]

## Score Changes

**Previous Score**: [X/10]
**Updated Score**: [Y/10]
**Reason for Change**: [Why score changed or stayed same]

## Key Updates

- **Update 1**: [Finding that changed]
- **Update 2**: [New insight from feedback]
- **Update 3**: [Refinement to previous analysis]

## Responses to User Questions

[Address each question from response.md]

## Top Risks (Updated)

1. **[Risk]**: [Updated assessment]
2. **[Risk]**: [Updated assessment]

## Recommendation

**[KILL/PIVOT/SHIP]**

[Updated reasoning based on iteration]

---

**Confidence Level**: [X/10] - [Reason for confidence or uncertainty]
```

### Adoption/GTM PM

```markdown
You are an expert **Adoption & Go-To-Market Product Manager** continuing your analysis.

## Context from Previous Iteration

### Original Requirements
{requirements.md}

### Your Previous Analysis
{previous iteration output}

### User Feedback
{response.md from current iteration}

---

## Your Task

Based on the user's feedback, provide an **updated analysis** addressing:

1. **Specific questions** about distribution, acquisition, GTM strategy, or growth mechanisms
2. **New information** about channels, partnerships, or user acquisition
3. **Refinements** to your GTM assessment
4. **Score updates** if feedback changes your evaluation

## Scoring Rubric (Same as Iteration 01)

Rate the **Adoption Feasibility** on a scale of 1-10:

- **9-10**: Viral/network effects, organic growth built-in
- **7-8**: Strong channels, clear path to reach users
- **5-6**: Moderate distribution, standard acquisition tactics
- **3-4**: Difficult distribution, high friction to reach users
- **1-2**: No clear path to users, distribution impossible

## Output Format

# Adoption & GTM Analysis - Iteration {N}

## Updated Assessment

### Changes from Previous Iteration
[What changed based on user feedback]

### Refined GTM Understanding
[Updated distribution or acquisition view]

### Updated Adoption Assessment
[How your assessment evolved]

## Score Changes

**Previous Score**: [X/10]
**Updated Score**: [Y/10]
**Reason for Change**: [Why score changed or stayed same]

## Key Updates

- **Update 1**: [Finding that changed]
- **Update 2**: [New insight from feedback]
- **Update 3**: [Refinement to previous analysis]

## Responses to User Questions

[Address each question from response.md]

## Top Risks (Updated)

1. **[Risk]**: [Updated assessment]
2. **[Risk]**: [Updated assessment]

## Recommendation

**[KILL/PIVOT/SHIP]**

[Updated reasoning based on iteration]

---

**Confidence Level**: [X/10] - [Reason for confidence or uncertainty]
```

---

## ERROR HANDLING

### Error: No review started
```
❌ Error: No review iterations found in product/{name}/review/

Please run the initial review first:

/product-review product/{name}/requirements.md
```

### Error: No response.md found
```
❌ Error: No response.md found in iteration {N}

To continue the review, create your feedback first:

1. Create: product/{name}/review/iterations/{N}/response.md
2. Write your questions, feedback, and new information
3. Run: /review-continue product/{name}/

Alternatively, use the response-template.md as a starting point.
```

### Error: Invalid product path
```
❌ Error: Invalid product path format

Expected: product/<name>/
Received: {args[0]}

Example: /review-continue product/my-app/
```

### Warning: No agents selected
```
⚠️ Warning: Pattern-matching didn't detect which agents to invoke.

Your response.md might be too generic. Please specify which agents you'd like
to respond:

Options:
1. /review-continue product/{name}/ --agents=all
2. /review-continue product/{name}/ --agents=market,business
3. Rewrite response.md with specific questions/topics

Available agents: market, user, technical, business, adoption
```

---

## USAGE EXAMPLES

### Continue with automatic agent detection
```bash
/review-continue product/my-app/
```

### Force all agents to respond
```bash
/review-continue product/my-app/ --agents=all
```

### Request specific agents
```bash
/review-continue product/my-app/ --agents=market,business
```

### Typical iteration workflow
```bash
# Initial review
/product-review product/my-app/requirements.md

# [Review outputs, write feedback]
# Create: product/my-app/review/iterations/01/response.md

# Continue iteration
/review-continue product/my-app/

# [Review iteration 02, write more feedback]
# Create: product/my-app/review/iterations/02/response.md

# Continue again
/review-continue product/my-app/

# [Repeat until satisfied]
```

---

**End of slash command template**
