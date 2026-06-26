# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Soft launch UX fixes** — 5 fixes from round-1 feedback: space bug, platform warning, quote/answer match, click-to-confirm, landing page. (2026-06-26)
- **Phase 1.4: UI polish** — role="progressbar" on all bars; focus-visible rings on all buttons; RTL ✦ fix; stale share text removed. (2026-06-26)
- **Phase 1.6/1.7: Analytics + feedback** — 4 quiz lifecycle events via Vercel Analytics; feedback form link on results page driven by env var. (2026-06-26)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

1. **Advisor review before MVP** — All 10 parties grounded; scores auto-refined; follow-up AI now guided by keyDimensions. Have advisor review the live app and `docs/score-review.md` (8 weak discriminators flagged in health + economy/growth topics) before launch.

2. **Add מצע links as parties publish them** — ישר! and הדמוקרטים have non-platform links. Monitor ביחד, ש"ס, etc. Update `lib/parties.ts` as links appear.

3. **Build MVP** — Active. Full scope in `docs/PHASED-ROADMAP.md`. Completed: 0.3 (grounding UI), 0.4 (security), 0.5 (quota degradation). Next: 0.7 scoring tests, then 1.1 remove prototype artifacts.

   _Next sessions:_
   - **1.8 (in progress)**: Soft launch underway — monitoring Langfuse, quota, mobile; iterating on feedback

   _Open decisions (discuss before implementing):_
   - **💬 Feedback channel** — currently wired to Google Form via `NEXT_PUBLIC_FEEDBACK_FORM_URL`. Discuss: Google Form vs. Slack (e.g. incoming webhook) vs. email (mailto:) vs. Tally/Typeform. Trade-offs: friction, anonymity, aggregation ease, setup cost.
   - **💬 Analytics depth** — currently 4 lifecycle events on Vercel Analytics. Discuss: (a) add richer events (tone/depth breakdown, answer-option distribution, free-text "other" adoption rate + content) vs. (b) migrate to Mixpanel free tier for cohorts, funnels, retention. Key events to consider: `option_selected {topicId, optionId}`, `free_text_submitted {topicId}`, `follow_up_asked {topicId, aspect}`.

   _Human tasks (parallel):_
   - **0.1** Advisor review of live app + `docs/score-review.md` (8 weak discriminators flagged)
   - **0.6** Content neutrality audit (3rd-party review of question framing)
   - **0.8** Infrastructure: connect voteassist.me domain; set Vercel env vars (UPSTASH_*, GEMINI_API_KEY, LANGFUSE_*, NEXT_PUBLIC_FEEDBACK_FORM_URL)

4. ⏸️ **Multi-language support** — _blocked on: MVP working in Hebrew_
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
