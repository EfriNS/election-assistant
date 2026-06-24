# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Numbered option badges + 'כתבו בעצמכם' elevation** — Sequential number badges on all options; free-text option elevated to equal visual partner; AI prologue can reference option numbers. (2026-06-25)
- **Aspect slug standardization + keyDimensions** — 28 slug remaps across all 10 grounding JSONs; `TOPIC_KEY_DIMENSIONS` export guides follow-up AI to highest-discriminating sub-dimensions first; Raam equality/law score corrected +2→+1. (2026-06-25)
- **Automated party score refinement** — Scoring script (Claude Sonnet over grounding data) + 9 score corrections applied; 8 weak discriminators flagged; `docs/score-review.md` audit trail. (2026-06-24)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

1. **Advisor review before MVP** — All 10 parties grounded; scores auto-refined; follow-up AI now guided by keyDimensions. Have advisor review the live app and `docs/score-review.md` (8 weak discriminators flagged in health + economy/growth topics) before launch.

2. **Add מצע links as parties publish them** — ישר! and הדמוקרטים have non-platform links. Monitor ביחד, ש"ס, etc. Update `lib/parties.ts` as links appear.

3. **Build MVP** — Pending advisor sign-off on scores + party coverage.

4. ⏸️ **Multi-language support** — _blocked on: MVP working in Hebrew_

5. ⏸️ **Multi-language support** — _blocked on: MVP working in Hebrew_
   - Russian, Arabic, English UI layers
   - Party platforms remain in Hebrew; answers/explanations translated

6. ⏸️ **Candidate records extension** — _blocked on: v1 stable_
   - Experience, notable actions/votes (official sources only, no social media)

7. ⏸️ **Multi-country generalization** — _blocked on: Israel v1 validated_

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
