# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Phased roadmap + MVP definition** — Prototype E confirmed winner. PHASED-ROADMAP.md, advisor review export tool, domain (voteassist.me). (2026-06-21)
- **Round 3 user testing** — Users happy with current version; Prototype E validated. (2026-06-21)
- **Round 3 UX polish + unified follow-up architecture** — Rewrote follow-up state machine (1 API call/answer), fixed back navigation stack, hints across all 8 topics, follow-up context cues (recap + label), animated loading verbs. (2026-06-19)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

1. **Phase 0 kickoff: advisor review packet** — `docs/advisor-review/questions-review.md` generated via `npm run export:questions`. Share with advisor for score validation + neutrality audit. Meeting this week. (See docs/PHASED-ROADMAP.md §0.1 + §0.6)

2. **Verify Gemini quota error handling** - Round 1 critical bug; fix went in but was never tested under load. Try hitting the limit intentionally in prototype D to confirm user-friendly error displays (not raw JSON).

3. **Verify party position scores with domain expert** - All 7 parties' scoring arrays in prototype A/B/C are manual estimates. Needs advisor review, especially ביחד (בנט/לפיד) and ישר! (איזנקוט) which are new.

4. **Add מצע links as parties publish them** - ישר! and הדמוקרטים have non-platform links. Monitor ביחד, ש"ס, etc. Update `lib/parties.ts` as links appear.

5. **Party platform data ingestion design** — Prototype E chosen. Design semi-automatic ingestion pipeline (scrape + human review/approval). Handle missing platforms gracefully. Handle versioning + timestamps for citations. (See PHASED-ROADMAP.md Phase 0.2)
   - Design semi-automatic ingestion pipeline (scrape + human review/approval)
   - Handle missing platforms gracefully ("Party X has not published a platform")
   - Handle platform versioning + timestamps (for exact quotations with citations)

6. ⏸️ **Build MVP** — _blocked on: Phase 0 prerequisites (advisor review, real platform data, quota hardening)_

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
