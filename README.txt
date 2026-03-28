* Goal: Discuss, plan, and build an "election assistant" — a public, free tool that helps individuals find their best-matching political party based on their personal values and priorities.

* Context:
The idea originated from a civic-minded individual who currently does this manually: friends call her asking which party to vote for (Israeli elections). She interviews them on their priorities (defense, foreign policy, education, etc.) and matches those against party platforms. The goal is to automate and scale this, making it available to the general public.

* Key Decisions & Constraints:

** Timeline
   - Israeli elections are approximately 6 months away. Enough time to build properly.

** Audience & Scale
   - Public tool, intended for wide distribution (not just a friend network).
   - Users are civic-minded individuals seeking informed, values-based voting guidance.

** Language
   - Hebrew is a must (primary language for Israeli users and party platforms).
   - Multi-language support is in scope: platforms are written in Hebrew, but the UI/assistant should support other languages (e.g., Russian, Arabic, English) to serve Israel's diverse electorate.

** Data & Curation
   - Party platform data is the core content. The "human advisor" acknowledges the responsibility of accurate curation and is willing to maintain this.
   - Automation of ingestion (scraping party sites) is desirable, but human review/validation is expected.
   - Sources should be factual: official party platforms + candidates' records (experience, notable actions/votes). Social media is explicitly excluded as a source.

** Results Presentation
   - Must show more than one option (ranked/scored).
   - Must show the "why" — ideally with exact quotations from party platforms.
   - Should feel trustworthy and non-partisan.

** Monetization & Promotion
   - Free tool, no monetization planned.
   - Sub-goal: personal brand building for the builder (me). This is secondary, must not compromise credibility, and may be done anonymously or very subtly.

** Cost Model
   - To be understood clearly. If API-based: builder bears costs → must be carefully capped.
   - If "bring your own account" (Gem/Project approach): costs are per user (their free tier). But this creates a UX/access barrier.

* Competitive Landscape (To Research)
   - Der Spiegel "Wahl-O-Mat" style quiz (see Screenshots/ directory) as a known reference.
   - Existing Israeli tools (Vote Compass, Mevcharim, others) — need to assess if current, maintained, and what gaps exist.
   - Research task: identify current Israeli election tools and their shortcomings.

* Solution Directions (Brainstormed)
   1. AI Agent (Claude Project / Gemini Gem) — conversational, user brings own account
   2. Quiz/questionnaire site (Wahl-O-Mat style) — deterministic, auditable
   3. Hybrid: structured quiz front-end + AI for nuanced follow-up and explanation
   - Other solutions are in scope for evaluation.

* UX Considerations
   - Easy to use: target audience is general public, not tech-savvy.
   - Questions/framing/tone may vary by age and other factors — personalization is a plus.
   - Conversational depth today is shallow; more follow-up questions would improve matching.

* Possible Extensions
   - Candidate profiles: experience, notable actions/votes (not social media).
   - Multi-country support (Israel-first, but architecture should consider generalization).

* Means Available
   - Claude Code (full app development capability).
   - Lovable (free, for rapid front-end prototyping).
   - API access (Claude, Gemini) — costs to be evaluated and capped.

* Open Tasks
   1. Competitive research: existing Israeli election tools (what exists, gaps, quality).
   2. Brainstorm and evaluate solution options (functional + technical).
   3. Prototype a "full experience" (UX walkthrough).
   4. Phased plan + MVP definition.
