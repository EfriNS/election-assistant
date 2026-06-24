# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Automated party score refinement** — Scoring script (Claude Sonnet over grounding data) + 9 score corrections applied; 8 weak discriminators flagged; `docs/score-review.md` audit trail. (2026-06-24)
- **Gemini quota hardening + monitoring** — Quota error handling added to all routes; token tracking in Langfuse; `/api/quota-check` cron with Slack alerts; 29 new tests. (2026-06-24)
- **Party grounding data + scoring expansion** — All 10 parties grounded (verbatim platform quotes); score arrays expanded 7→10; `/api/score-topics` + follow-up redesign implemented. (2026-06-23/24)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

1. **Standardize `aspect` labels in grounding JSONs + add `keyDimensions` to questions.ts (Phase 5a+5b)** — Follow-up `coveredAspects` deduplication silently fails because aspect slugs are inconsistent across parties (e.g., `"two-state-1967-borders"` vs `"two-state-solution"` vs `"political-settlement"` all refer to the same concept). Fix in two parts:
   - **5a**: Define canonical slug vocabulary per topic; update all 10 `data/groundings/*.json` files to use consistent slugs
   - **5b**: Add `keyDimensions?: string[]` to `TopicQ` type in `lib/questions.ts`; populate per topic; wire into `app/api/follow-up/route.ts` so the prompt prioritizes known-differentiating aspects

2. **Add מצע links as parties publish them** — ישר! and הדמוקרטים have non-platform links. Monitor ביחד, ש"ס, etc. Update `lib/parties.ts` as links appear.

3. **Build MVP** — Score review now complete (automated). Consider weak discriminators in health + economy/growth (see `docs/score-review.md`) before launch.

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
