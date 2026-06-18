# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Round 3 design: Prototype E + modified D** - Full round 3 design spec in SOLUTION-DESIGN.md; two question sets (ענייני/אישי) with audit-first approach; new landing page with tone + depth signals; Prototype E flow spec; Modified D spec. (2026-06-19)
- **Round 2 user testing + feedback** - 2 users tested; documented in round-2-feedback.md; AI-first entry rejected by teenager; User 1 wants priorities→AI hybrid; tone/depth calibration design direction established. (2026-06-18)
- **Unified results page + prototype D extraction** - `UnifiedResultsPage` shared across A/B/C/D; AI profile summary + micro-blurbs; `/api/results` + `/api/results-d`; synthesis detection fix. (2026-06-17)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

1. **Round 3 implementation** - Build Prototype E + modified D + new landing page per `docs/SOLUTION-DESIGN.md` (Round 3 section). Start with question set audit (classify existing 8 B questions as ענייני/אישי, write counterparts), then landing page, then E flow, then D modification, then bug fixes.

2. **Verify Gemini quota error handling** - Round 1 critical bug; fix went in but was never tested under load. Try hitting the limit intentionally in prototype D to confirm user-friendly error displays (not raw JSON).

3. **Verify party position scores with domain expert** - All 7 parties' scoring arrays in prototype A/B/C are manual estimates. Needs advisor review, especially ביחד (בנט/לפיד) and ישר! (איזנקוט) which are new.

4. **Phased plan + MVP definition** (~2-3 hours)
   - Define MVP scope (Hebrew-only? Which parties? Which question set?)
   - Identify phases: MVP → v1 → extensions (candidate records, multi-country)
   - Output: phased roadmap

5. **Add מצע links as parties publish them** - ישר! and הדמוקרטים have non-platform links. Monitor ביחד, ש"ס, etc. Update `lib/parties.ts` as links appear.

6. ⏸️ **Party platform data ingestion design** — _blocked on: prototype winner chosen_
   - Design semi-automatic ingestion pipeline (scrape + human review/approval)
   - Handle missing platforms gracefully ("Party X has not published a platform")
   - Handle platform versioning + timestamps (for exact quotations with citations)

7. ⏸️ **Build MVP** — _blocked on: prototype winner chosen + phased plan_

8. ⏸️ **Multi-language support** (~varies) — _blocked on: MVP working in Hebrew_
   - Russian, Arabic, English UI layers
   - Party platforms remain in Hebrew; answers/explanations translated

9. ⏸️ **Candidate records extension** — _blocked on: v1 stable_
   - Experience, notable actions/votes (official sources only, no social media)

10. ⏸️ **Multi-country generalization** — _blocked on: Israel v1 validated_

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
- What is the recommended technical approach? (hybrid confirmed; exact implementation TBD in solution design)
- What tone/style should the tool use? (formal, informal, user-selectable?) → TBD in UX design
- Should the project be open-sourced from the start, or later? → public after MVP
- How many questions? → research says 30–35 is optimal; exact set TBD
- Ingestion pipeline design, admin UI → TBD in technical design phase

### Future Ideas
- Candidate profile pages (experience, voting record)
- Multi-country support (architecture to be designed with this in mind)
- Shareable results ("Here's why I'm voting for X")
- Embeddable widget for civic organizations
- "How did the parties perform on their promises?" (post-election retrospective)

### Reference Material
- Screenshots/ — Der Spiegel Hamburg election quiz (UX reference)
- README.txt — Full project brief and context
