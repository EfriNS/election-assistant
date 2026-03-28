# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Project kickoff + requirements gathering** - README finalized, key decisions documented (timeline, scope, languages, curation model). (2026-03-28)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

1. **Competitive research: existing Israeli election tools** (~2-3 hours)
   - Identify current tools (Vote Compass, Mevcharim, others)
   - Assess: are they maintained? What gaps exist? What do they do well?
   - Also: scan international equivalents (Wahl-O-Mat, ISideWith, etc.) for UX/feature inspiration
   - Output: competitive brief → inform solution design

2. **Solution design + options evaluation** (~3-4 hours)
   - Brainstorm functional + technical options (quiz, AI agent, hybrid)
   - Evaluate against: UX friction, cost model, trust/auditability, maintenance burden
   - Decision: what to build
   - Output: recommended approach with trade-offs

3. **UX prototype: "full experience" walkthrough** (~4-6 hours)
   - Sketch the end-to-end user journey (onboarding → questions → results → "why")
   - Address: tone/formality selection, multi-language, missing-platform handling
   - Output: mockup or clickable prototype (Lovable candidate)

4. **Phased plan + MVP definition** (~2-3 hours)
   - Define MVP scope (Hebrew-only? Which parties? Which question set?)
   - Identify phases: MVP → v1 → extensions (candidate records, multi-country)
   - Output: phased roadmap

5. ⏸️ **Party platform data ingestion design** — _blocked on: solution design decision_
   - Design semi-automatic ingestion pipeline (scrape + human review/approval)
   - Handle missing platforms gracefully ("Party X has not published a platform")
   - Handle platform versioning + timestamps (for exact quotations with citations)

6. ⏸️ **Build MVP** — _blocked on: phased plan approved_

7. ⏸️ **Multi-language support** (~varies) — _blocked on: MVP working in Hebrew_
   - Russian, Arabic, English UI layers
   - Party platforms remain in Hebrew; answers/explanations translated

8. ⏸️ **Candidate records extension** — _blocked on: v1 stable_
   - Experience, notable actions/votes (official sources only, no social media)

9. ⏸️ **Multi-country generalization** — _blocked on: Israel v1 validated_

---

## 📚 REFERENCE

### Key Decisions Made
- **Timeline**: ~6 months to Israeli elections
- **Audience**: General public, wide distribution (not a private tool)
- **Languages**: Hebrew-first; Russian, Arabic, English in scope
- **Data sources**: Official party platforms + candidate records; social media excluded
- **Results format**: Ranked options + "why" with exact quotations and source URLs
- **Parties**: All parties; show "no platform available" for those without one
- **Curation**: Semi-automatic ingestion + human (advisor) review/approval
- **Monetization**: Free tool; no revenue goal
- **Promotion**: Personal brand for builder; anonymous/subtle; must not hurt credibility
- **Transparency**: Consider open-sourcing on GitHub for credibility
- **Cost model**: API-based → builder pays; must rate-limit and cap costs

### Open Questions
- What is the recommended technical approach? (quiz vs. AI agent vs. hybrid)
- What tone/style should the tool use? (formal, informal, user-selectable?)
- Should the project be open-sourced from the start, or later?
- How to handle parties whose platform hasn't been updated in years?
- What's the cost cap / acceptable spend per month?

### Future Ideas
- Candidate profile pages (experience, voting record)
- Multi-country support (architecture to be designed with this in mind)
- Shareable results ("Here's why I'm voting for X")
- Embeddable widget for civic organizations
- "How did the parties perform on their promises?" (post-election retrospective)

### Reference Material
- Screenshots/ — Der Spiegel Hamburg election quiz (UX reference)
- README.txt — Full project brief and context
