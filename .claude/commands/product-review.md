---
description: "Run multi-agent product review on requirements document"
argument-hint: "<product-requirements-path> [--agents=5] [--mode=vertical]"
---

You are running a comprehensive **Multi-Agent Product Review System**.

This system deploys 5 specialized PM agents to analyze product requirements from different dimensions, producing structured reports with actionable Kill/Pivot/Ship recommendations.

---

## CONFIGURATION

### Arguments Parsing

**Required**:
- `{args[0]}`: Path to requirements document (must be: `product/<name>/requirements.md`)

**Optional** (parse from args array):
- `--agents=N`: Number of agents to deploy (default: 5, options: 3, 5, 7)
- `--mode=MODE`: Analysis mode (default: "vertical", options: "vertical", "persona")

**Example usage**:
```bash
/product-review product/pm-feedback-system/requirements.md
/product-review product/my-app/requirements.md --agents=7
/product-review product/feature-x/requirements.md --mode=vertical
```

**Output location**:
- Automatically creates: `product/<name>/review/iterations/01/`
- All agent analyses saved to iteration 01
- Subsequent iterations use `/review-continue` command

---

## WORKFLOW

### Step 1: Validate Input & Setup (2 minutes)

1. **Parse requirements path** from `{args[0]}`
   - Expected format: `product/<name>/requirements.md`
   - Extract product name from path (e.g., "pm-feedback-system" from `product/pm-feedback-system/requirements.md`)
   - If path doesn't match pattern, show error with correct format example

2. **Read requirements document** from `{args[0]}`
   - Validate quality:
     - Minimum 500 words (if shorter, warn user and suggest expanding)
     - Contains problem statement and solution overview
     - If quality too low, ask user to expand before proceeding

3. **Parse configuration**:
   - Extract `--agents` value (default: 5)
   - Extract `--mode` value (default: "vertical")

4. **Determine output directory**:
   - Auto-generate: `product/<name>/review/iterations/01/`
   - Check if `iterations/01/` already exists:
     - If exists: Error - "Review already started. Use /review-continue to iterate."
     - If not exists: Create directory structure

5. **Create iteration directory**:
   - Create: `product/<name>/review/iterations/01/`
   - This will contain all agent analysis outputs

---

### Step 2: Deploy Agents in Parallel (15-20 minutes)

**IMPORTANT**: Use the Task tool to deploy ALL agents in parallel for speed.

Deploy these 5 agents (if `--agents=5` or default):
1. **Market Differentiation PM**
2. **User Value Assessment PM**
3. **Technical Feasibility PM**
4. **Business Viability PM**
5. **Adoption/GTM PM**

If `--agents=7`, also deploy:
6. **Contrarian PM** (challenges assumptions)
7. **Synthesis PM** (meta-analysis of other agents)

**For each agent**:
- Pass full requirements document as context
- Use agent-specific prompt template (see Agent Templates section below)
- Collect structured markdown output

---

### Step 3: Synthesize Findings (5 minutes)

After all agents complete:

1. **Parse agent outputs**:
   - Extract scores from each agent
   - Extract key findings
   - Extract risks
   - Extract recommendations (Kill/Pivot/Ship)

2. **Calculate overall verdict**:
   - **Kill**: Any agent scores <3/10
   - **Pivot**: Any agent scores 3-6/10
   - **Ship**: All agents score 7+/10

3. **Consolidate insights**:
   - Identify convergence (all agents agree on problem)
   - Identify divergence (conflicting recommendations)
   - Extract top 3-5 risks across all dimensions

4. **Generate paths forward**:
   - If Pivot: Synthesize 3 concrete pivot options from agent recommendations
   - If Ship: Synthesize validation plan from agent suggestions
   - If Kill: Explain why (which dimensions failed)

---

### Step 4: Generate Output Files (3 minutes)

Create files in `product/<name>/review/iterations/01/`:

**Agent Analysis Files:**
1. **EXECUTIVE_SUMMARY.md** - 10-minute read synthesis
2. **01_DIFFERENTIATION_ANALYSIS.md** - Market Differentiation PM output
3. **02_USER_VALUE_ASSESSMENT.md** - User Value PM output
4. **03_TECHNICAL_FEASIBILITY.md** - Technical Feasibility PM output
5. **04_BUSINESS_VIABILITY.md** - Business Viability PM output
6. **05_ADOPTION_ANALYSIS.md** - Adoption/GTM PM output
7. **README.md** - Navigation guide

(If 7 agents, also create 06_CONTRARIAN.md and 07_SYNTHESIS.md)

**Response Template:**
8. **response-template.md** - Minimal template for user feedback

Template content (very loose, not prescriptive):
```markdown
# Response to Iteration 01

[Write your responses, questions, and feedback here]

---

**You can include:**
- Questions for specific agents (e.g., "Market PM: which verticals work best?")
- Feedback on findings (e.g., "The business model concern is valid, but...")
- New information not in original requirements
- Pivots or alternatives to explore
- Areas needing deeper analysis

**Format:** Completely freeform. Claude will analyze your feedback and route
to appropriate agents when you run `/review-continue`.

---

**When ready to continue:**
1. Rename this file to `response.md` (remove `-template`)
2. Run: `/review-continue product/<name>/`
3. Iteration 02 will be generated with updated analyses
```

---

### Step 5: Report Completion

Provide user summary:
```
✅ Product Review Complete (Iteration 01)!

📊 Overall Verdict: [KILL / PIVOT / SHIP]

📈 Scores Summary:
- Market Differentiation: [X/10]
- User Value: [X/10]
- Technical Feasibility: [X/10]
- Business Viability: [X/10]
- Adoption/GTM: [X/10]

⚠️ Top Risks:
1. [Risk 1]
2. [Risk 2]
3. [Risk 3]

📁 Detailed reports saved to: product/<name>/review/iterations/01/

👉 Next steps:
1. Read: product/<name>/review/iterations/01/EXECUTIVE_SUMMARY.md
2. Review agent analyses as needed
3. Create: product/<name>/review/iterations/01/response.md (your feedback)
4. Run: /review-continue product/<name>/ (generates iteration 02)
```

---

## AGENT TEMPLATES

### Template: Market Differentiation PM

```markdown
# AGENT: Market Differentiation PM

You are a **Market Differentiation Product Manager** analyzing a product requirements document.

## Your Lens

You focus on:
- **Competitive landscape**: Who already solves this problem? What do they do well?
- **Positioning**: Why would users choose this over alternatives?
- **Moats**: What prevents competitors from copying this?
- **Market timing**: Is now the right time for this product?

## Scoring Rubric

Rate the product on **Differentiation Strength** (1-10):
- **1-3**: Commoditized, no clear advantage over free/cheap alternatives
- **4-6**: Incrementally better, but not 10x better
- **7-8**: Strong differentiation in 1-2 dimensions
- **9-10**: Unique value proposition, defensible moat

## Analysis Framework

Evaluate these areas systematically:

1. **Competitive Analysis**
   - List direct competitors (solve exact same problem)
   - List indirect competitors (solve similar pain point differently)
   - For each competitor: What % of proposed features do they already offer?
   - Identify competitive advantages (what they do better)

2. **True Unique Value**
   - What does this product do that NO competitor can easily replicate?
   - Is the differentiation technical, UX-based, business model, or distribution?
   - How long would it take a competitor to copy this? (Days, months, years?)

3. **Defensibility (Moat Analysis)**
   - Data moat? (Gets better with usage)
   - Network effects? (More valuable with more users)
   - Switching costs? (Hard for users to leave)
   - Brand/trust? (Reputation takes time to build)
   - Regulatory/compliance? (Barriers to entry)
   - Technical complexity? (Hard to replicate)

4. **Market Timing**
   - Why now? What changed in the market/technology/user behavior?
   - Are we too early? (Users not ready, infrastructure missing)
   - Are we too late? (Market already saturated)
   - What trends support this product's success?

## Output Format

Provide a structured markdown analysis with these sections:

### 1. Differentiation Score: [X/10]

**Breakdown**:
- Competitive landscape: [X/10]
- Unique value: [X/10]
- Defensibility: [X/10]
- Market timing: [X/10]

**Overall**: [X/10] (average or weighted)

### 2. Competitive Landscape

**Direct Competitors**:
| Competitor | Overlap % | What They Do Better | What We Do Better |
|------------|-----------|---------------------|-------------------|
| [Name] | [%] | [Strengths] | [Our advantages] |
| [Name] | [%] | [Strengths] | [Our advantages] |

**Indirect Competitors**:
| Alternative | How They Solve Problem | Threat Level (High/Med/Low) |
|-------------|------------------------|------------------------------|
| [Name] | [Approach] | [Level] |

**Competitive Summary**: [2-3 sentence synthesis]

### 3. True Unique Value

**What makes this product truly different**:
- [Unique aspect 1]
- [Unique aspect 2]
- [Unique aspect 3]

**Differentiation type**: [Technical / UX / Business Model / Distribution / Other]

**Sustainability**: Can competitors copy this in [timeframe]? Why or why not?

### 4. Moat Analysis

**Primary moat(s)**:
- [Moat type]: [Explanation of how it works]

**Moat strength**: [Strong / Moderate / Weak]

**Reasoning**: [Why this moat will or won't hold]

### 5. Market Timing

**Why now**:
- [Trend/change 1]
- [Trend/change 2]
- [Trend/change 3]

**Timing assessment**: [Perfect timing / Slightly early / Slightly late / Wrong timing]

**Reasoning**: [Explanation]

### 6. Key Findings

**Critical insights** (3-5 points):
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### 7. Biggest Risks

**Prioritized by likelihood × impact**:
1. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

2. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

3. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

### 8. Recommendation: [KILL / PIVOT / SHIP]

**Verdict**: [KILL / PIVOT / SHIP]

**Reasoning**:
- [Reason 1]
- [Reason 2]
- [Reason 3]

### 9. Pivot Options (if score <7)

**If this needs to pivot, here are 3 concrete options to strengthen differentiation**:

**Pivot Option 1: [Name]**
- **Change**: [What would change]
- **Why stronger**: [How this improves differentiation]
- **Effort**: [Low / Medium / High]

**Pivot Option 2: [Name]**
- **Change**: [What would change]
- **Why stronger**: [How this improves differentiation]
- **Effort**: [Low / Medium / High]

**Pivot Option 3: [Name]**
- **Change**: [What would change]
- **Why stronger**: [How this improves differentiation]
- **Effort**: [Low / Medium / High]

### 10. Validation Plan (if ship)

**If proceeding, validate these assumptions**:
1. **[Assumption 1]**: How to test: [Method]
2. **[Assumption 2]**: How to test: [Method]
3. **[Assumption 3]**: How to test: [Method]

---

**Instructions for analysis**:
- Be brutally honest. Challenge assumptions. Don't sugarcoat.
- Use specific examples and data when possible
- If requirements doc lacks information, note gaps and make educated guesses
- Focus on "why" not just "what"

## Requirements Document

[REQUIREMENTS DOCUMENT CONTENT WILL BE INSERTED HERE]

---

Provide your analysis now following the output format exactly.
```

---

### Template: User Value Assessment PM

```markdown
# AGENT: User Value Assessment PM

You are a **User Value Product Manager** analyzing a product requirements document.

## Your Lens

You focus on:
- **Problem validation**: Is this a real, painful problem worth solving?
- **Value proposition**: How much value does the solution provide?
- **User adoption barriers**: What prevents users from getting value?
- **Value-to-effort ratio**: Is the value worth the user's effort/cost?

## Scoring Rubric

Rate the product on **User Value Strength** (1-10):
- **1-3**: Nice-to-have, weak pain point, low willingness to pay
- **4-6**: Moderate pain, clear value but not urgent
- **7-8**: Strong pain, high value, users actively seeking solutions
- **9-10**: Critical pain, 10x value improvement, users will pay premium

## Analysis Framework

Evaluate these areas systematically:

1. **Problem Validation**
   - Is the problem real? (Evidence: user research, market data, personal experience)
   - How painful is it? (Frequency × intensity × inability to solve otherwise)
   - Who feels this pain most acutely?
   - Current workarounds? (What do users do today without this product?)

2. **Value Proposition Analysis**
   - What specific value does this provide? (Time saved, money saved, new capability, etc.)
   - Is value quantifiable? (e.g., "saves 5 hours/week" vs "makes work easier")
   - Value magnitude: Incremental (10-20% better) vs transformational (10x better)
   - Value frequency: One-time, weekly, daily?

3. **User Adoption Barriers**
   - Setup friction (installation, configuration, learning curve)
   - Ongoing friction (daily usage complexity, maintenance burden)
   - Switching costs (leaving current solution)
   - Trust barriers (data privacy, reliability concerns)
   - Cost barriers (price vs perceived value)

4. **Value-to-Effort Ratio**
   - User effort required: Low / Medium / High
   - Value delivered: Low / Medium / High
   - Net outcome: Is juice worth the squeeze?

## Output Format

Provide a structured markdown analysis with these sections:

### 1. User Value Score: [X/10]

**Breakdown**:
- Problem severity: [X/10]
- Value magnitude: [X/10]
- Adoption friction: [X/10] (inverted - low friction = high score)
- Value-to-effort ratio: [X/10]

**Overall**: [X/10]

### 2. Problem Validation

**Problem statement** (in user's words):
> "[User pain point]"

**Problem severity**:
- **Frequency**: [How often users encounter this problem]
- **Intensity**: [How painful when it happens - 1-10 scale]
- **Current workarounds**: [What users do today]
- **Workaround quality**: [Good enough / Barely adequate / Completely broken]

**Evidence of problem**:
- [Evidence 1 - user research, market data, etc.]
- [Evidence 2]
- [Evidence 3]

**Who feels this pain**:
- **Primary segment**: [User type with strongest pain]
- **Secondary segment**: [User type with moderate pain]
- **Market size**: [Estimated number of users with this problem]

**Problem validation assessment**: [Strong / Moderate / Weak / Unvalidated]

### 3. Value Proposition Analysis

**Specific value delivered**:
| Value Type | Quantified Value | Confidence Level |
|------------|------------------|------------------|
| Time saved | [X hours/week] | [High/Med/Low] |
| Money saved | [$ amount] | [High/Med/Low] |
| Revenue generated | [$ amount] | [High/Med/Low] |
| New capability | [Description] | [High/Med/Low] |
| Quality improvement | [Description] | [High/Med/Low] |

**Value magnitude**:
- **Incremental** (10-20% better than alternatives)
- **Significant** (2-3x better than alternatives)
- **Transformational** (10x better, or enables previously impossible outcome)

**Value frequency**:
- **One-time**: [If yes, is it high enough to justify adoption?]
- **Weekly**: [Recurring value builds habit]
- **Daily**: [High-frequency value = strong retention]

**Value proposition strength**: [Weak / Moderate / Strong / Exceptional]

### 4. User Adoption Barriers

**Setup friction**:
| Barrier | Severity (High/Med/Low) | Impact on Adoption |
|---------|-------------------------|---------------------|
| Installation | [Level] | [% users lost] |
| Configuration | [Level] | [% users lost] |
| Learning curve | [Level] | [% users lost] |
| Data migration | [Level] | [% users lost] |

**Ongoing friction**:
| Barrier | Severity (High/Med/Low) | Impact on Retention |
|---------|-------------------------|---------------------|
| Daily usage complexity | [Level] | [% users churn] |
| Maintenance burden | [Level] | [% users churn] |
| Performance issues | [Level] | [% users churn] |

**Other barriers**:
- **Switching costs**: [High / Med / Low] - [Explanation]
- **Trust barriers**: [High / Med / Low] - [Explanation]
- **Cost barriers**: [High / Med / Low] - [Explanation]

**Total adoption friction**: [High / Medium / Low]

**Estimated conversion funnel**:
- Aware of product: 100%
- Willing to try: [%]
- Complete setup: [%]
- Reach activation: [%]
- Become active user: [%]

### 5. Value-to-Effort Ratio

**User effort required**:
- Setup: [X hours/minutes]
- Learning: [X hours/days]
- Daily usage: [X minutes/day]
- **Total effort**: [High / Medium / Low]

**Value delivered**:
- [Quantified value from section 3]
- **Total value**: [High / Medium / Low]

**Net assessment**:
- [ ] **Terrible deal** (High effort, low value - users won't adopt)
- [ ] **Questionable** (Medium effort, medium value - needs strong differentiation)
- [ ] **Good deal** (Low effort, high value - users will try)
- [ ] **No-brainer** (Minimal effort, massive value - users will pay premium)

### 6. Key Findings

**Critical insights** (3-5 points):
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### 7. Biggest Risks

**Prioritized by likelihood × impact**:
1. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

2. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

3. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

### 8. Recommendation: [KILL / PIVOT / SHIP]

**Verdict**: [KILL / PIVOT / SHIP]

**Reasoning**:
- [Reason 1]
- [Reason 2]
- [Reason 3]

### 9. Pivot Options (if score <7)

**If this needs to pivot, here are 3 concrete options to strengthen user value**:

**Pivot Option 1: [Name]**
- **Change**: [What would change]
- **Why stronger value**: [How this improves value proposition]
- **Effort**: [Low / Medium / High]

**Pivot Option 2: [Name]**
- **Change**: [What would change]
- **Why stronger value**: [How this improves value proposition]
- **Effort**: [Low / Medium / High]

**Pivot Option 3: [Name]**
- **Change**: [What would change]
- **Why stronger value**: [How this improves value proposition]
- **Effort**: [Low / Medium / High]

### 10. Validation Plan (if ship)

**Critical assumptions to test**:
1. **[Assumption 1]**: How to test: [Method] (Timeline: [X days/weeks])
2. **[Assumption 2]**: How to test: [Method] (Timeline: [X days/weeks])
3. **[Assumption 3]**: How to test: [Method] (Timeline: [X days/weeks])

**User research needed**:
- [ ] Problem interviews (validate pain exists)
- [ ] Solution validation (would users use this?)
- [ ] Willingness to pay (pricing research)
- [ ] Usability testing (adoption friction assessment)

---

**Instructions for analysis**:
- Be brutally honest about user value - don't oversell
- Use specific, quantifiable metrics when possible
- If requirements doc makes unvalidated claims (e.g., "saves 10 hours/week"), flag as assumption
- Focus on user perspective, not builder's excitement

## Requirements Document

[REQUIREMENTS DOCUMENT CONTENT WILL BE INSERTED HERE]

---

Provide your analysis now following the output format exactly.
```

---

### Template: Technical Feasibility PM

```markdown
# AGENT: Technical Feasibility PM

You are a **Technical Feasibility Product Manager** analyzing a product requirements document.

## Your Lens

You focus on:
- **Architecture complexity**: How hard is this to build?
- **Technical risks**: What could go wrong during implementation?
- **Value-to-effort ratio**: Is the technical effort worth the value delivered?
- **Scalability**: Will this architecture support growth?
- **Technical debt**: Is this approach sustainable long-term?

## Scoring Rubric

Provide **two separate scores**:

**Complexity Score** (1-10):
- **1-3**: Trivial (off-the-shelf solutions, no custom code)
- **4-6**: Moderate (standard architecture, some custom code)
- **7-8**: Complex (distributed systems, advanced algorithms)
- **9-10**: Extremely complex (research-level, high technical risk)

**ROI Score** (1-10 - value delivered vs technical effort):
- **1-3**: Terrible ROI (massive effort, low value)
- **4-6**: Questionable ROI (high effort for moderate value)
- **7-8**: Good ROI (reasonable effort for high value)
- **9-10**: Exceptional ROI (low effort, massive value - leverage existing tools)

## Analysis Framework

Evaluate these areas systematically:

1. **Architecture Assessment**
   - Technology stack: Is it appropriate for the problem?
   - Over-engineering: Are simpler alternatives possible?
   - Under-engineering: Will this scale or need rewrite later?
   - Dependencies: External services, libraries, APIs

2. **Implementation Complexity**
   - Core features: Time estimate for each
   - Technical challenges: What's hard/novel?
   - Team capability: Does team have required skills?
   - Total effort: Realistic timeline

3. **Technical Risks**
   - Integration risks (third-party APIs, data sources)
   - Performance risks (scalability, latency)
   - Security risks (data handling, auth, vulnerabilities)
   - Maintenance risks (tech debt, long-term sustainability)

4. **Alternative Approaches**
   - Could existing tools solve this? (SaaS alternatives)
   - Simpler technical approaches?
   - Buy vs build analysis

## Output Format

Provide a structured markdown analysis with these sections:

### 1. Technical Feasibility Scores

**Complexity Score**: [X/10]
- Architecture complexity: [X/10]
- Implementation difficulty: [X/10]
- Integration complexity: [X/10]
- **Overall complexity**: [X/10]

**ROI Score**: [X/10]
- Value delivered: [X/10]
- Technical effort required: [X/10]
- **Value-to-effort ratio**: [X/10]

### 2. Architecture Assessment

**Proposed technology stack**:
| Component | Technology | Appropriate? | Reasoning |
|-----------|-----------|--------------|-----------|
| [Component 1] | [Tech] | ✅ / ⚠️ / ❌ | [Why good/bad fit] |
| [Component 2] | [Tech] | ✅ / ⚠️ / ❌ | [Why good/bad fit] |
| [Component 3] | [Tech] | ✅ / ⚠️ / ❌ | [Why good/bad fit] |

**Architecture critique**:
- **Strengths**: [What's well-designed]
- **Weaknesses**: [What's concerning]
- **Over-engineering**: [Unnecessary complexity, if any]
- **Under-engineering**: [Will this need rewrite later?]

**Overall architecture**: [Well-designed / Adequate / Concerning / Broken]

### 3. Implementation Complexity

**Feature breakdown with effort estimates**:
| Feature | Complexity (H/M/L) | Est. Effort | Technical Challenge |
|---------|-------------------|-------------|---------------------|
| [Feature 1] | [Level] | [X hours/days] | [What's hard] |
| [Feature 2] | [Level] | [X hours/days] | [What's hard] |
| [Feature 3] | [Level] | [X hours/days] | [What's hard] |

**Total implementation effort**: [X hours/days/weeks]

**Confidence in estimate**: [High / Medium / Low] - [Why]

**Technical challenges**:
1. **[Challenge 1]**: [Description] - [How to address]
2. **[Challenge 2]**: [Description] - [How to address]
3. **[Challenge 3]**: [Description] - [How to address]

**Team capability assessment**:
- Required skills: [List skills needed]
- Skill gaps: [What team might be missing]
- Learning curve: [How long to get up to speed]

### 4. Technical Risks

**High-priority risks**:

**Integration Risks**:
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Third-party API failure] | [H/M/L] | [H/M/L] | [Strategy] |
| [Data source unavailable] | [H/M/L] | [H/M/L] | [Strategy] |

**Performance Risks**:
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Scalability bottleneck] | [H/M/L] | [H/M/L] | [Strategy] |
| [Latency issues] | [H/M/L] | [H/M/L] | [Strategy] |

**Security Risks**:
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Data breach] | [H/M/L] | [H/M/L] | [Strategy] |
| [Auth vulnerabilities] | [H/M/L] | [H/M/L] | [Strategy] |

**Maintenance Risks**:
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Technical debt accumulation] | [H/M/L] | [H/M/L] | [Strategy] |
| [Deprecated dependencies] | [H/M/L] | [H/M/L] | [Strategy] |

### 5. Alternative Approaches

**Could existing tools solve this?**

| Alternative | Coverage | Effort to Implement | Trade-offs |
|-------------|----------|---------------------|------------|
| [SaaS Tool 1] | [% of requirements] | [X hours] | [What you lose] |
| [Open Source 1] | [% of requirements] | [X hours] | [What you lose] |
| [Simpler approach] | [% of requirements] | [X hours] | [What you lose] |

**Buy vs Build analysis**:
- **Buy** (use existing tool): [Pros and cons]
- **Build** (custom solution): [Pros and cons]
- **Hybrid** (use tools + custom glue): [Pros and cons]

**Recommended approach**: [Buy / Build / Hybrid] - [Reasoning]

### 6. Scalability Assessment

**Will this architecture scale?**

**Current design supports**:
- Users: [X concurrent users / total users]
- Throughput: [X requests/second, transactions/day, etc.]
- Data: [X GB/TB of data]

**Scaling limitations**:
1. [Bottleneck 1]: Hits limit at [X scale]
2. [Bottleneck 2]: Hits limit at [X scale]
3. [Bottleneck 3]: Hits limit at [X scale]

**Scaling strategy**:
- [ ] Will scale without rewrite
- [ ] Minor refactor needed at [X scale]
- [ ] Major rewrite needed at [X scale]
- [ ] Fundamentally unscalable

### 7. Key Findings

**Critical insights** (3-5 points):
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### 8. Biggest Risks

**Prioritized by likelihood × impact**:
1. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

2. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

3. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

### 9. Recommendation: [KILL / PIVOT / SHIP]

**Verdict**: [KILL / PIVOT / SHIP]

**Reasoning**:
- [Reason 1]
- [Reason 2]
- [Reason 3]

### 10. Pivot Options (if complexity high or ROI low)

**If this needs to pivot, here are 3 technical alternatives**:

**Pivot Option 1: [Name]**
- **Technical change**: [What would change in architecture]
- **Why simpler/better ROI**: [Explanation]
- **Effort saved**: [X hours/days]

**Pivot Option 2: [Name]**
- **Technical change**: [What would change in architecture]
- **Why simpler/better ROI**: [Explanation]
- **Effort saved**: [X hours/days]

**Pivot Option 3: [Name]**
- **Technical change**: [What would change in architecture]
- **Why simpler/better ROI**: [Explanation]
- **Effort saved**: [X hours/days]

### 11. Technical Validation Plan (if ship)

**Proof-of-concept needed**:
1. **[Technical risk 1]**: Spike to validate [what to test] (Effort: [X hours])
2. **[Technical risk 2]**: Spike to validate [what to test] (Effort: [X hours])
3. **[Technical risk 3]**: Spike to validate [what to test] (Effort: [X hours])

**Before committing to full build**:
- [ ] Validate third-party API integration works
- [ ] Benchmark performance with realistic data
- [ ] Security review of architecture
- [ ] Confirm team has required skills (or budget for learning/hiring)

---

**Instructions for analysis**:
- Be realistic about technical complexity - don't underestimate
- Challenge over-engineering - simpler is usually better
- Focus on ROI, not just feasibility
- If requirements lack technical details, make educated assumptions and note them

## Requirements Document

[REQUIREMENTS DOCUMENT CONTENT WILL BE INSERTED HERE]

---

Provide your analysis now following the output format exactly.
```

---

### Template: Business Viability PM

```markdown
# AGENT: Business Viability PM

You are a **Business Viability Product Manager** analyzing a product requirements document.

## Your Lens

You focus on:
- **Unit economics**: Does the business model work at scale?
- **Monetization**: Can this generate revenue/profit?
- **Sustainability**: Is this viable long-term?
- **Cost structure**: What are the ongoing costs?
- **Pricing power**: Can you charge enough to be profitable?

## Scoring Rubric

Rate the product on **Business Viability** (1-10):
- **1-3**: Broken economics, will lose money at scale
- **4-6**: Marginal economics, needs optimization
- **7-8**: Healthy economics, profitable at scale
- **9-10**: Exceptional economics, high margins, sustainable

## Analysis Framework

Evaluate these areas systematically:

1. **Unit Economics**
   - Revenue per user/transaction
   - Cost per user/transaction (COGS, infrastructure, support)
   - Gross margin: (Revenue - COGS) / Revenue
   - Customer acquisition cost (CAC)
   - Lifetime value (LTV)
   - LTV/CAC ratio (target: >3)

2. **Monetization Strategy**
   - Pricing model: One-time, subscription, usage-based, freemium, ads, etc.
   - Price point: Appropriate for value delivered?
   - Willingness to pay: Will users actually pay this?
   - Revenue predictability: Recurring vs one-time

3. **Cost Structure**
   - Fixed costs: Infrastructure, team, overhead
   - Variable costs: Per-user/per-transaction costs
   - Cost scaling: Do costs grow linearly or sublinearly with users?
   - Break-even: How many users/revenue to cover costs?

4. **Sustainability**
   - Margin trajectory: Improving or degrading over time?
   - Competitive pressure: Can competitors undercut pricing?
   - Dependency risks: Reliance on expensive third-party services?
   - Long-term profitability: Path to profitability clear?

## Output Format

Provide a structured markdown analysis with these sections:

### 1. Business Viability Score: [X/10]

**Breakdown**:
- Unit economics: [X/10]
- Monetization strategy: [X/10]
- Cost structure: [X/10]
- Long-term sustainability: [X/10]

**Overall**: [X/10]

### 2. Unit Economics Analysis

**Revenue per user/transaction**:
| Metric | Value | Confidence | Notes |
|--------|-------|------------|-------|
| ARPU (monthly) | $[X] | [H/M/L] | [Assumptions] |
| Transaction revenue | $[X] | [H/M/L] | [Assumptions] |

**Cost per user/transaction**:
| Cost Category | Value | % of Revenue | Notes |
|---------------|-------|--------------|-------|
| COGS (direct costs) | $[X] | [%] | [What's included] |
| Infrastructure | $[X] | [%] | [Servers, APIs, etc.] |
| Support | $[X] | [%] | [Customer support costs] |
| **Total COGS** | **$[X]** | **[%]** | |

**Gross margin**: [X%] (Target: >70% for SaaS, >50% for marketplaces)

**CAC & LTV**:
| Metric | Value | Confidence | Notes |
|--------|-------|------------|-------|
| CAC (customer acquisition cost) | $[X] | [H/M/L] | [Marketing, sales costs per customer] |
| LTV (lifetime value) | $[X] | [H/M/L] | [Revenue over customer lifetime] |
| LTV/CAC ratio | [X.X] | [H/M/L] | [Target: >3, ideal: >5] |

**Unit economics verdict**: [Strong / Healthy / Marginal / Broken]

### 3. Monetization Strategy Analysis

**Pricing model**: [One-time / Subscription / Usage-based / Freemium / Ads / Other]

**Proposed pricing**:
| Tier | Price | Features | Target Segment |
|------|-------|----------|----------------|
| [Free] | $0 | [Features] | [Who uses this] |
| [Basic] | $[X]/mo | [Features] | [Who uses this] |
| [Pro] | $[X]/mo | [Features] | [Who uses this] |
| [Enterprise] | Custom | [Features] | [Who uses this] |

**Pricing analysis**:
- **Value alignment**: Does price match value delivered? [Yes / No / Unclear]
- **Competitive pricing**: vs alternatives: [Higher / Similar / Lower]
- **Willingness to pay**: Evidence that users will pay: [Strong / Moderate / Weak / None]
- **Price sensitivity**: Can we increase prices later? [Yes / Maybe / No]

**Revenue predictability**:
- [ ] **High** (Recurring subscription, low churn)
- [ ] **Medium** (Usage-based, variable monthly)
- [ ] **Low** (One-time purchases, unpredictable demand)

**Monetization verdict**: [Strong / Viable / Questionable / Unproven]

### 4. Cost Structure Analysis

**Fixed costs** (monthly):
| Category | Cost | Notes |
|----------|------|-------|
| Team salaries | $[X] | [# people × avg salary] |
| Infrastructure | $[X] | [Servers, tools, services] |
| Overhead | $[X] | [Office, benefits, admin] |
| **Total fixed** | **$[X]** | |

**Variable costs** (per user/transaction):
| Category | Cost | Scaling |
|----------|------|---------|
| API calls | $[X] | [Linear / Sublinear / Superlinear] |
| Storage | $[X] | [Linear / Sublinear / Superlinear] |
| Compute | $[X] | [Linear / Sublinear / Superlinear] |
| **Total variable** | **$[X]** | |

**Cost scaling analysis**:
- Do costs grow slower than revenue? [Yes / No / Unclear]
- Economies of scale possible? [Yes / No]
- Cost optimization opportunities: [List 2-3]

**Break-even analysis**:
- Monthly revenue needed: $[X]
- Users needed (at $[X] ARPU): [Y users]
- Months to break-even: [Z months] (at [growth rate] growth)

**Confidence in break-even**: [High / Medium / Low] - [Reasoning]

### 5. Long-Term Sustainability Assessment

**Margin trajectory**:
- **Current gross margin**: [X%]
- **At 10x scale**: [X%] (better / same / worse)
- **At 100x scale**: [X%] (better / same / worse)

**Competitive pressure on pricing**:
- Can competitors undercut? [Yes / Maybe / No]
- How much? [X% lower pricing possible]
- Our defensibility: [Strong / Moderate / Weak]

**Dependency risks**:
| Dependency | Cost Impact | Alternatives | Risk Level |
|------------|-------------|--------------|------------|
| [Third-party API] | [% of COGS] | [Yes / No] | [H/M/L] |
| [Cloud provider] | [% of COGS] | [Yes / No] | [H/M/L] |
| [Other service] | [% of COGS] | [Yes / No] | [H/M/L] |

**Path to profitability**:
- [ ] **Already profitable** (Revenue > Costs)
- [ ] **Clear path** (Break-even at achievable scale)
- [ ] **Requires optimization** (Costs too high, need to reduce)
- [ ] **Requires pivot** (Economics don't work, need new model)
- [ ] **Unclear** (Too many unknowns)

**Sustainability verdict**: [Highly sustainable / Sustainable / Concerning / Unsustainable]

### 6. Key Findings

**Critical insights** (3-5 points):
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### 7. Biggest Risks

**Prioritized by likelihood × impact**:
1. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

2. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

3. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

### 8. Recommendation: [KILL / PIVOT / SHIP]

**Verdict**: [KILL / PIVOT / SHIP]

**Reasoning**:
- [Reason 1]
- [Reason 2]
- [Reason 3]

### 9. Pivot Options (if score <7)

**If business model needs fixing, here are 3 pivot options**:

**Pivot Option 1: [Name]**
- **Change**: [What would change - pricing, model, target segment, etc.]
- **Why better economics**: [How this improves unit economics]
- **Example**: [Concrete pricing/model example]

**Pivot Option 2: [Name]**
- **Change**: [What would change]
- **Why better economics**: [How this improves unit economics]
- **Example**: [Concrete pricing/model example]

**Pivot Option 3: [Name]**
- **Change**: [What would change]
- **Why better economics**: [How this improves unit economics]
- **Example**: [Concrete pricing/model example]

### 10. Validation Plan (if ship)

**Critical assumptions to test**:
1. **[Assumption 1]**: How to test: [Method] (e.g., pricing survey, beta cohort)
2. **[Assumption 2]**: How to test: [Method]
3. **[Assumption 3]**: How to test: [Method]

**Before scaling**:
- [ ] Validate willingness to pay at proposed price point
- [ ] Confirm actual COGS with real users (not theoretical)
- [ ] Test cost scaling (does infrastructure cost grow as expected?)
- [ ] Validate CAC through paid marketing experiments

---

**Instructions for analysis**:
- Be realistic about costs - include ALL costs (infrastructure, support, sales, etc.)
- If requirements don't specify monetization, propose 2-3 options and analyze each
- Focus on scalability - does this work at 10x, 100x scale?
- Flag unrealistic pricing or cost assumptions

## Requirements Document

[REQUIREMENTS DOCUMENT CONTENT WILL BE INSERTED HERE]

---

Provide your analysis now following the output format exactly.
```

---

### Template: Adoption/GTM PM

```markdown
# AGENT: Adoption & Go-to-Market PM

You are an **Adoption & Go-to-Market Product Manager** analyzing a product requirements document.

## Your Lens

You focus on:
- **Distribution channels**: How will users discover this product?
- **Adoption friction**: What prevents users from trying/using it?
- **Growth mechanisms**: How does the product grow (viral, paid, organic, etc.)?
- **Activation**: Can users reach "aha moment" quickly?
- **Retention**: Will users stick around?

## Scoring Rubric

Rate the product on **Adoption Friction** (1-10, inverted scale):
- **1-3**: Extremely high friction, 70-90% drop-off during setup/onboarding
- **4-6**: Moderate friction, 30-50% drop-off
- **7-8**: Low friction, 10-20% drop-off
- **9-10**: Minimal friction, near-frictionless adoption (<10% drop-off)

**Note**: This is INVERTED from other scores - high friction = low score

## Analysis Framework

Evaluate these areas systematically:

1. **Distribution Channels**
   - How will users discover this?
   - Which channels are most effective?
   - Organic vs paid vs viral distribution
   - Defensibility of distribution strategy

2. **Adoption Friction Analysis**
   - Setup friction: Installation, account creation, onboarding
   - Learning curve: How long to get value?
   - Switching costs: What do users give up from current solution?
   - Integration friction: Does this fit into existing workflow?

3. **Growth Mechanisms**
   - Viral growth: Does product naturally spread user-to-user?
   - Network effects: More valuable with more users?
   - Content/SEO: Discoverable through search?
   - Paid acquisition: CAC-efficient channels?

4. **Activation & Retention**
   - Time to value: How long until "aha moment"?
   - Activation rate: % of signups who reach activation?
   - Retention cohorts: Do users stick around?
   - Churn drivers: Why do users leave?

## Output Format

Provide a structured markdown analysis with these sections:

### 1. Adoption Friction Score: [X/10]

**Breakdown** (inverted - low friction = high score):
- Discovery friction: [X/10]
- Setup friction: [X/10]
- Learning curve friction: [X/10]
- Integration friction: [X/10]

**Overall**: [X/10]

**Interpretation**:
- 9-10: Near-frictionless, users can start in <5 minutes
- 7-8: Low friction, users can activate in <30 minutes
- 4-6: Moderate friction, hours to activation
- 1-3: High friction, days to activation or users give up

### 2. Distribution Channel Analysis

**Primary distribution channels**:
| Channel | Reach Potential | Cost per User | Effort | Effectiveness |
|---------|-----------------|---------------|--------|---------------|
| [Channel 1] | [H/M/L] | $[X] | [H/M/L] | [H/M/L] |
| [Channel 2] | [H/M/L] | $[X] | [H/M/L] | [H/M/L] |
| [Channel 3] | [H/M/L] | $[X] | [H/M/L] | [H/M/L] |

**Channel strategy assessment**:
- **Organic discoverability**: [High / Medium / Low]
  - SEO potential: [Explanation]
  - Word-of-mouth potential: [Explanation]
  - Community-driven: [Explanation]

- **Paid acquisition viability**: [High / Medium / Low]
  - Channels: [Google Ads, social, etc.]
  - CAC: $[X] (vs LTV: $[Y])
  - Profitable? [Yes / Maybe / No]

- **Viral growth potential**: [High / Medium / Low]
  - Viral mechanism: [How product spreads]
  - Viral coefficient: [X] (target: >1 for exponential growth)
  - Shareability: [What makes users share?]

**Distribution strategy verdict**: [Strong / Viable / Weak / Missing]

### 3. Adoption Friction Breakdown

**Setup friction** (from awareness → activated user):

| Step | Description | Drop-off Rate | Time Required | Friction Level |
|------|-------------|---------------|---------------|----------------|
| Discover | User becomes aware | N/A | - | - |
| Visit | User visits site/product | [%] | - | [H/M/L] |
| Signup | Account creation | [%] | [X min] | [H/M/L] |
| Install | Download/install (if needed) | [%] | [X min] | [H/M/L] |
| Configure | Setup/config | [%] | [X min] | [H/M/L] |
| Onboard | Learning/tutorial | [%] | [X min] | [H/M/L] |
| Activate | First real value | [%] | [X min] | [H/M/L] |

**Total drop-off**: [%] (100 aware → [X] activated)

**Critical friction points**:
1. **[Friction point 1]**: [Description] - Loses [%] of users
2. **[Friction point 2]**: [Description] - Loses [%] of users
3. **[Friction point 3]**: [Description] - Loses [%] of users

**Learning curve**:
- Time to "aha moment": [X minutes/hours/days]
- Time to competency: [X hours/days/weeks]
- Complexity: [Simple / Moderate / Complex]

**Switching costs** (from existing solution):
| Switching Barrier | Severity | Impact |
|-------------------|----------|--------|
| Data migration | [H/M/L] | [How painful] |
| Workflow change | [H/M/L] | [How painful] |
| Team onboarding | [H/M/L] | [How painful] |
| Integration rebuilding | [H/M/L] | [How painful] |

**Integration friction**:
- Fits into existing workflow? [Yes / Partially / No]
- Standalone tool or requires ecosystem? [Standalone / Ecosystem]
- Complementary tools needed: [List if any]

### 4. Growth Mechanism Analysis

**Viral growth**:
- **Viral loop exists?** [Yes / No]
- **Mechanism**: [How product spreads user-to-user]
- **Viral coefficient**: [X] (invites/shares per user that convert)
- **Viral cycle time**: [X days/weeks] (time for one user to bring in another)
- **Assessment**: [Strong viral growth / Moderate / Weak / None]

**Network effects**:
- **Type**: [Direct / Indirect / Two-sided / None]
- **Strength**: [Strong / Moderate / Weak / None]
- **Description**: [How product gets more valuable with more users]

**Content & SEO**:
- **User-generated content?** [Yes / No]
- **Indexable pages**: [X pages from user activity]
- **SEO potential**: [High / Medium / Low]
- **Content freshness**: [Updated frequently / Static]

**Paid acquisition**:
- **Target CAC**: $[X]
- **Viable channels**: [List channels]
- **LTV/CAC ratio**: [X] (from Business Viability analysis)
- **Scalability**: Can we profitably scale paid? [Yes / Maybe / No]

**Organic/word-of-mouth**:
- **Share triggers**: [What makes users tell others?]
- **Community potential**: [Subreddit, Discord, forums, etc.]
- **Influencer/media fit**: [Would press/influencers cover this?]

**Growth mechanism verdict**: [Strong / Viable / Weak / Needs work]

### 5. Activation & Retention Analysis

**Activation**:
- **Activation metric**: [What counts as "activated"? e.g., completed first action, invited teammate, etc.]
- **Time to activation**: [X minutes/hours] (from signup)
- **Estimated activation rate**: [%] of signups
- **Barriers to activation**: [What stops users from activating?]

**Retention**:
- **Usage frequency**: [Daily / Weekly / Monthly / Sporadic]
- **Retention drivers**: [What brings users back?]
  - Habit formation: [Yes / No]
  - Email/notifications: [Yes / No]
  - Network lock-in: [Yes / No]
  - Data accumulation: [Yes / No]

**Churn drivers** (why users leave):
1. [Reason 1] - [% of churned users]
2. [Reason 2] - [% of churned users]
3. [Reason 3] - [% of churned users]

**Retention cohorts** (estimated):
| Cohort | Retention Rate | Notes |
|--------|---------------|-------|
| Week 1 | [%] | [What % of activated users return in week 1] |
| Month 1 | [%] | [What % return in month 1] |
| Month 3 | [%] | [What % still active after 3 months] |

**Retention verdict**: [Strong / Moderate / Weak / Concerning]

### 6. Go-to-Market Strategy Assessment

**Proposed GTM plan** (from requirements doc):
- Phase 1: [Description]
- Phase 2: [Description]
- Phase 3: [Description]

**GTM critique**:
- **Strengths**: [What's well-planned]
- **Weaknesses**: [What's missing or concerning]
- **Realism**: [Achievable / Optimistic / Unrealistic]

**Launch readiness**:
- [ ] Distribution channel identified
- [ ] Target user segment clear
- [ ] Activation flow defined
- [ ] Retention strategy exists
- [ ] Growth mechanism in place

**Missing from GTM plan**:
1. [Gap 1]
2. [Gap 2]
3. [Gap 3]

### 7. Key Findings

**Critical insights** (3-5 points):
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### 8. Biggest Risks

**Prioritized by likelihood × impact**:
1. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

2. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

3. **[Risk name]** (Likelihood: [H/M/L], Impact: [H/M/L])
   - Description: [What could go wrong]
   - Mitigation: [How to reduce risk]

### 9. Recommendation: [KILL / PIVOT / SHIP]

**Verdict**: [KILL / PIVOT / SHIP]

**Reasoning**:
- [Reason 1]
- [Reason 2]
- [Reason 3]

### 10. Pivot Options (if high friction or weak GTM)

**If this needs to pivot to reduce friction or improve GTM**:

**Pivot Option 1: [Name]**
- **Change**: [What would change in distribution or product]
- **Why lower friction**: [How this improves adoption]
- **Example**: [Concrete change]

**Pivot Option 2: [Name]**
- **Change**: [What would change]
- **Why lower friction**: [How this improves adoption]
- **Example**: [Concrete change]

**Pivot Option 3: [Name]**
- **Change**: [What would change]
- **Why lower friction**: [How this improves adoption]
- **Example**: [Concrete change]

### 11. GTM Validation Plan (if ship)

**Pre-launch validation**:
1. **Landing page test**: Measure interest (email signups)
2. **Beta cohort**: [X users] to test activation flow
3. **Distribution experiment**: Test [channel] with $[budget]

**Launch metrics to track**:
| Metric | Target | Measurement |
|--------|--------|-------------|
| Signup → Activation | [X%] | [How to measure] |
| Week 1 retention | [X%] | [How to measure] |
| Viral coefficient | [X] | [Invites sent × conversion rate] |
| CAC (if paid) | $[X] | [Channel costs / new users] |

**Kill signals** (abort if):
- Activation rate <[X%] after 100 signups
- Week 1 retention <[X%]
- CAC >[Y]× LTV

---

**Instructions for analysis**:
- Be realistic about adoption friction - most products have high drop-off
- If requirements lack GTM details, note this as critical gap
- Focus on user perspective: Would YOU try this product? Why or why not?
- Flag unrealistic GTM assumptions (e.g., "will go viral", "influencers will love this")

## Requirements Document

[REQUIREMENTS DOCUMENT CONTENT WILL BE INSERTED HERE]

---

Provide your analysis now following the output format exactly.
```

---

## OUTPUT TEMPLATES

### Template: Executive Summary

```markdown
# [PRODUCT NAME]: Product Review Executive Summary

**Date**: [YYYY-MM-DD]
**Reviewed By**: Multi-Agent Product Review System (5 PM Agents)
**Status**: Pre-Development Analysis
**Overall Verdict**: [KILL / PIVOT / SHIP]

---

## TL;DR (30 seconds)

[2-3 sentences summarizing the verdict and top reason]

Example:
> **PIVOT recommended**. While the technical execution is solid (7.5/10), the product faces fatal distribution challenges (8/10 friction) and lacks clear differentiation from existing solutions (3/10). Three viable pivot paths identified to strengthen market position and reduce adoption barriers.

---

## Overall Assessment

[2-3 paragraphs providing context and nuance to the verdict]

Example structure:
- What the product aims to do
- What the review found (high-level)
- Why the verdict makes sense
- What happens next

---

## Scores by Dimension

| Dimension | Score | Status | Key Finding |
|-----------|-------|--------|-------------|
| 🎯 **Market Differentiation** | [X/10] | [🔴 Critical / 🟡 Needs Work / 🟢 Strong] | [One sentence finding] |
| 💎 **User Value** | [X/10] | [🔴 Critical / 🟡 Needs Work / 🟢 Strong] | [One sentence finding] |
| ⚙️ **Technical Feasibility** | [X/10] complexity<br/>[X/10] ROI | [🔴 Critical / 🟡 Needs Work / 🟢 Strong] | [One sentence finding] |
| 💰 **Business Viability** | [X/10] | [🔴 Critical / 🟡 Needs Work / 🟢 Strong] | [One sentence finding] |
| 📈 **Adoption/GTM** | [X/10] | [🔴 Critical / 🟡 Needs Work / 🟢 Strong] | [One sentence finding] |

**Scoring key**:
- 🔴 **Critical (1-3)**: Fatal flaws, likely to fail
- 🟡 **Needs Work (4-6)**: Marginal, requires changes
- 🟢 **Strong (7-10)**: Solid, ready to proceed

---

## Top 3 Risks (Cross-Dimensional)

### 1. [Risk Name]
**Likelihood**: [High / Medium / Low] | **Impact**: [High / Medium / Low]

[Description of risk - 2-3 sentences]

**Affected dimensions**: [Which agent(s) identified this]

**Mitigation**: [How to reduce risk]

---

### 2. [Risk Name]
[Same format]

---

### 3. [Risk Name]
[Same format]

---

## Verdict: [KILL / PIVOT / SHIP]

### Why [Verdict]

**Primary reasons**:
1. [Reason 1 with supporting data]
2. [Reason 2 with supporting data]
3. [Reason 3 with supporting data]

**Convergence**: [What did all agents agree on?]

**Divergence**: [Where did agents disagree? How to interpret?]

---

## Three Paths Forward

### Path A: [Option Name] - [Recommended / Alternative]

**What changes**:
- [Change 1]
- [Change 2]
- [Change 3]

**Why this works**:
- [Benefit 1]
- [Benefit 2]

**Effort required**: [X weeks / months]

**Success probability**: [High / Medium / Low]

---

### Path B: [Option Name] - [Recommended / Alternative]

[Same format]

---

### Path C: [Option Name] - [Recommended / Alternative]

[Same format]

---

## Critical Questions You Must Answer

Before proceeding, validate these assumptions:

1. **[Question 1]**: [Why this matters] → [How to test]
2. **[Question 2]**: [Why this matters] → [How to test]
3. **[Question 3]**: [Why this matters] → [How to test]

---

## Next Steps: This Week

### If Pursuing Path [A/B/C]:

**Week 1 Actions**:
1. **[Action 1]** (Timeline: [X days])
   - [Sub-task]
   - [Sub-task]
   - **Kill signal**: [What would make you stop]

2. **[Action 2]** (Timeline: [X days])
   - [Sub-task]
   - [Sub-task]
   - **Kill signal**: [What would make you stop]

3. **[Action 3]** (Timeline: [X days])
   - [Sub-task]
   - [Sub-task]
   - **Kill signal**: [What would make you stop]

**Success criteria**: [What does "validated" look like after Week 1?]

---

## Detailed Analysis Files

For deep-dives into specific dimensions:

- 📊 **[Market Differentiation](./01_DIFFERENTIATION_ANALYSIS.md)**: Competitive landscape, moats, positioning
- 💎 **[User Value Assessment](./02_USER_VALUE_ASSESSMENT.md)**: Problem validation, value proposition
- ⚙️ **[Technical Feasibility](./03_TECHNICAL_FEASIBILITY.md)**: Architecture, complexity, ROI
- 💰 **[Business Viability](./04_BUSINESS_VIABILITY.md)**: Unit economics, monetization, sustainability
- 📈 **[Adoption Analysis](./05_ADOPTION_ANALYSIS.md)**: Distribution, friction, growth mechanisms

**Reading recommendation**:
- If score is 🔴 Critical (1-3): **Must read** detailed analysis
- If score is 🟡 Needs Work (4-6): **Should read** to understand gaps
- If score is 🟢 Strong (7-10): **Optional** (already validated)

---

**Generated by**: PM Feedback System v1.0
**Review completed in**: [X minutes]
```

---

### Template: Navigation README

```markdown
# Product Review: Navigation Guide

This directory contains a comprehensive **5-agent product review** of [PRODUCT NAME].

---

## Quick Start (10 minutes)

### 1. Read This First
👉 **[EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)** - 10-minute read

- Overall verdict (Kill/Pivot/Ship)
- Scores across 5 dimensions
- Top 3 risks
- Recommended paths forward

### 2. Then Deep-Dive Based on Scores

**If any dimension scored 🔴 Critical (1-3)**: Read that analysis immediately

**If multiple dimensions scored 🟡 Needs Work (4-6)**: Prioritize by impact to your goals

---

## Detailed Analysis Files

### 📊 Market Differentiation
**File**: [01_DIFFERENTIATION_ANALYSIS.md](./01_DIFFERENTIATION_ANALYSIS.md)
**Score**: [X/10] [🔴 / 🟡 / 🟢]

**Read this if**:
- You want to understand competitive landscape
- Wondering "why would users choose us?"
- Concerned about moats and defensibility

**Key question answered**: *Can we win in this market?*

---

### 💎 User Value Assessment
**File**: [02_USER_VALUE_ASSESSMENT.md](./02_USER_VALUE_ASSESSMENT.md)
**Score**: [X/10] [🔴 / 🟡 / 🟢]

**Read this if**:
- Validating problem/solution fit
- Questioning value proposition strength
- Concerned about user adoption barriers

**Key question answered**: *Will users actually want this?*

---

### ⚙️ Technical Feasibility
**File**: [03_TECHNICAL_FEASIBILITY.md](./03_TECHNICAL_FEASIBILITY.md)
**Complexity**: [X/10] | **ROI**: [X/10]

**Read this if**:
- Evaluating technical approach
- Concerned about complexity or timelines
- Wondering about value-to-effort ratio

**Key question answered**: *Can we build this efficiently?*

---

### 💰 Business Viability
**File**: [04_BUSINESS_VIABILITY.md](./04_BUSINESS_VIABILITY.md)
**Score**: [X/10] [🔴 / 🟡 / 🟢]

**Read this if**:
- Evaluating unit economics
- Questioning monetization strategy
- Concerned about profitability at scale

**Key question answered**: *Will this make money?*

---

### 📈 Adoption & GTM
**File**: [05_ADOPTION_ANALYSIS.md](./05_ADOPTION_ANALYSIS.md)
**Score**: [X/10] [🔴 / 🟡 / 🟢]

**Read this if**:
- Planning go-to-market strategy
- Concerned about distribution channels
- Wondering about growth mechanisms

**Key question answered**: *How do we acquire and retain users?*

---

## How to Use This Review

### Scenario 1: Quick Decision
- Read EXECUTIVE_SUMMARY.md (10 min)
- If verdict aligns with your intuition → Proceed
- If verdict surprises you → Read dimension that differs most

### Scenario 2: Deep Understanding
- Read EXECUTIVE_SUMMARY.md (10 min)
- Read all 🔴 Critical analyses (20 min each)
- Skim 🟡 Needs Work analyses (10 min each)
- Skip 🟢 Strong analyses (already validated)

### Scenario 3: Pivot Planning
- Read EXECUTIVE_SUMMARY.md → "Three Paths Forward"
- For each path, read relevant dimension analyses
- Evaluate pivot options from each agent
- Choose path, then validate critical assumptions

---

## What to Do Next

### If Verdict = KILL
1. Archive this project idea
2. Document learnings (what didn't work, why)
3. Move to next idea

### If Verdict = PIVOT
1. Choose one of the three paths from EXECUTIVE_SUMMARY.md
2. Read detailed analyses for dimensions that need changes
3. Update requirements doc based on pivot
4. Re-run review on pivoted version

### If Verdict = SHIP
1. Read validation plans from each agent
2. Create week-by-week validation roadmap
3. Define kill signals (what would stop you)
4. Proceed with MVP development

---

## Review Metadata

- **Product**: [PRODUCT NAME]
- **Date**: [YYYY-MM-DD]
- **Agents**: 5 (Market, User Value, Technical, Business, Adoption)
- **Requirements Doc**: [Path to requirements file]
- **Review Time**: [X minutes]

---

**Questions?** Review the detailed analyses or refer to critical assumptions in EXECUTIVE_SUMMARY.md
```

---

## IMPLEMENTATION NOTES

### Argument Parsing Logic

When the command runs, parse arguments like this:

```
args[0] = requirements file path (required, format: product/<name>/requirements.md)
args contains "--agents=N" → extract N (default: 5)
args contains "--mode=MODE" → extract MODE (default: "vertical")
Output directory: auto-generated as product/<name>/review/iterations/01/
```

### Parallel Agent Execution

Use the Task tool to deploy all agents simultaneously:

```markdown
Deploy 5 agents in parallel using Task tool:

1. Task: "Market Differentiation PM analysis"
   Prompt: [Full agent template with requirements doc inserted]

2. Task: "User Value Assessment PM analysis"
   Prompt: [Full agent template with requirements doc inserted]

... (repeat for all 5 agents)
```

Wait for all agents to complete, then collect outputs.

### Synthesis Logic

After collecting all 5 agent outputs:

1. **Extract scores**: Parse markdown outputs for score values
2. **Calculate verdict**:
   - If any score <3 → KILL
   - If any score 3-6 → PIVOT
   - If all scores 7+ → SHIP
3. **Consolidate findings**: Merge key findings, deduplicate risks
4. **Generate executive summary**: Use template, fill in synthesized data

### Output File Generation

Create all files in output directory:

1. Use Write tool to create each file
2. Follow templates exactly
3. Ensure cross-references work (links between files)
4. Add navigation README for easy orientation

---

## ERROR HANDLING

### Error: Requirements file not found
```
❌ Error: Requirements file not found at {args[0]}

Please provide a valid path to your requirements document.

Example: /product-review product/my-product/requirements.md
```

### Error: Requirements doc too short
```
⚠️ Warning: Requirements document is only [X] words.

For best results, requirements should be 500+ words including:
- Problem statement
- Solution overview
- Target users
- Technical approach (optional)
- Go-to-market plan (optional)

Would you like to proceed anyway, or expand the document first?
```

### Error: Output directory exists
```
⚠️ Warning: Output directory {output_directory} already contains review files.

Continuing will overwrite existing files.

Proceed? [Y/n]
```

---

## USAGE EXAMPLES

### Basic usage
```bash
/product-review product/my-product-idea/requirements.md
```

### Custom agents (7 agents for deeper analysis)
```bash
/product-review product/my-product-idea/requirements.md --agents=7
```

### Different analysis modes
```bash
/product-review product/my-product-idea/requirements.md --mode=persona
```

### Combined options
```bash
/product-review product/complex-idea/requirements.md --agents=7 --mode=vertical
```

---

**End of slash command template**
