# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Party grounding data + scoring expansion** — All 10 parties grounded (verbatim platform quotes); score arrays expanded 7→10; `/api/score-topics` + follow-up redesign implemented. (2026-06-23/24)
- **Free-text scoring design** — Decided: follow-up answers scored against party platform data (not proxies); follow-up questions redesigned to probe party-differentiating sub-dimensions; moved from v1 to MVP. See `docs/FREE-TEXT-SCORING-DESIGN.md`. (2026-06-22)
- **Scoring architecture discussion** — Resolved that free-text scoring ("other" + follow-ups) is a unified design problem; added as blocking prerequisite before Phase 0.2 implementation. (2026-06-22)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

1. **Phase 0 kickoff: advisor review packet** — `docs/advisor-review/questions-review.md` generated via `npm run export:questions`. Share with advisor for score validation + neutrality audit. Meeting this week. (See docs/PHASED-ROADMAP.md §0.1 + §0.6)

2. **Verify Gemini quota error handling** - Round 1 critical bug; fix went in but was never tested under load. Try hitting the limit intentionally in prototype D to confirm user-friendly error displays (not raw JSON).

3. **Verify party position scores with domain expert** - All 10 parties' scoring arrays are manual estimates. Needs advisor review, especially ביחד (בנט/לפיד), ישר! (איזנקוט), רע"ם, יהדות התורה, and עוצמה יהודית. Aspect slugs in grounding JSONs are placeholders — advisor review (item #1) will finalize them.

4. **Add מצע links as parties publish them** - ישר! and הדמוקרטים have non-platform links. Monitor ביחד, ש"ס, etc. Update `lib/parties.ts` as links appear.

5. ⏸️ **Build MVP** — _blocked on: Phase 0 prerequisites (advisor review, real platform data, quota hardening)_

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
