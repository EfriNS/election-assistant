# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Repo housekeeping: removed stale Contendre/CV-Refinery boilerplate** — `CLAUDE.md`, `.claude/commands/*.md`, and `docs/learnings/` had all inherited unadapted content from unrelated project templates (a Python/MCP server "Contendre", and a Supabase/Playwright "CV Refinery" app) — wrong test commands (`pytest`/`black`/`ruff`/`mypy`, `npm run test:run`, Supabase edge-function deploys), a whole MCP-tooling section, and 5 fully-irrelevant learning files. Replaced with real Next.js/Vitest/Vercel guidance throughout; deleted what had nothing salvageable. (2026-07-03)
- **Depth vs. brevity: decision reached** — Keep the current full-depth flow (option a); invest in targeted UX/UI improvements (option c) rather than a shorter/alternate mode. Two adjacent improvements already contribute toward this: the 2–4 (not fixed 3–4) follow-up option count, and the canonical aspect taxonomy reducing repetitive/restated follow-ups. Unblocks backlog #2 (UX/UI review). (2026-07-03)
- **Source-provenance tiering: two-field model (provenance × concreteness)** — Replaced the single hand-maintained per-party `sourceQuality` with a per-entry `provenance` (official-current/official-outdated/joint-list/third-party) × `concreteness` (quantified/named-mechanism/specific-stance/generic) model, driven by a user-reviewed draft classification that caught two real data errors (עוצמה's "official" sources were both illegitimate; חד"ש's zoha.org.il is a third-party journal, not joint-list). Re-collected עוצמה from its real official site. Wired `getBestEvidenceForTopic` (official-only unless none exists) into all 3 real call sites: score-topics prompt, results quoting/blurb-AI, follow-up dimension-selection. Populated all 257 entries across 10 parties; new regression test suite. This closes TODO #1(c). (2026-07-03)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

1. 💬 **DISCUSSION: UX/UI review + overhaul** — Multiple round-4 users (and prior rounds) flagged "too much text", "too many options", headings not prominent enough. Warrants a dedicated UX discussion and systematic review of text density, visual hierarchy, typography, and interaction patterns across the quiz flow — even if core functionality stays the same. The text comments from testing are symptoms of a broader UX conversation we haven't had yet. Now the active next step: the depth-vs-brevity decision (2026-07-03) chose to keep full depth and pursue targeted UX/UI improvements (option c) instead of a shorter/alternate mode — this is that follow-through work.

2. ✅ **"אודות" section** — Built: `/about` static page (lightweight scope, footer link). Content: builders (מאיה ואפרי נטל-שי), data sources, neutrality statement, privacy, feedback channels (widget + GitHub Issues). Advisor attribution placeholder still pending final wording review.

3. **Build MVP** — Active. Full scope in `docs/PHASED-ROADMAP.md`. Completed: 0.3 (grounding UI), 0.4 (security), 0.5 (quota degradation), 0.7 (scoring tests), 1.1 (remove prototype artifacts). Next: 1.8 soft launch iteration.

   _Next sessions:_
   - **1.8 (in progress)**: Soft launch underway — monitoring Langfuse, quota, mobile; iterating on feedback

   _Open decisions (discuss before implementing):_
   - ✅ **"ענית" for un-grounded topics** — resolved: show gray "—" chip for topics with no party data (chip row, not accordion). (2026-06-27)
   - ✅ **Feedback channel** — resolved: floating in-app widget → Slack #election-feedback. (2026-06-27)
   - ✅ **Analytics depth** — resolved: migrated to Mixpanel (EU, free tier), full funnel + priority distribution + topic engagement, dashboard live. Design in `docs/ANALYTICS-DESIGN.md`, board spec in `docs/MIXPANEL-DASHBOARDS.md`. (2026-06-28, dashboard built 2026-07-01)

   _Human tasks (parallel):_
   - ✅ **0.1** Advisor review of live app UX — done (drove the 2026-07-01 neutrality fixes, 2026-07-02 canonical aspect taxonomy, and 2026-07-03 source-provenance tiering)
   - **0.6** Content neutrality audit (3rd-party review of question framing)
   - **0.8** Infrastructure: connect voteassist.me domain; set Vercel env vars (UPSTASH_*, GEMINI_API_KEY, LANGFUSE_*, NEXT_PUBLIC_FEEDBACK_FORM_URL)

4. **Open-source the repository** — Repo is currently private. Steps before going public: (a) audit git history for secrets (`gitleaks` / `trufflehog`), (b) review all comments and TODOs for anything not safe to publish, (c) add LICENSE (MIT or Apache), (d) clean up README for external audience, (e) run security re-assessment (see #5). Deferred to post-MVP per original decision.

5. **Security re-assessment** — Initial security review done (MVP phase 0.4). Re-validate before going public: API key exposure, input sanitization, rate limiting, dependency vulnerabilities (`npm audit`). May be run as part of open-source prep (#4) or independently beforehand.

6. **Graphical shareable card** — Single-screen image (≈600×400px) optimized for social/WhatsApp sharing: top match + score, 2-3 topic chips, branding. Complements the PDF export (different use case: "share a teaser" vs. "save full results"). Options: server-side canvas (Satori/`@vercel/og`), or screenshot crop from Puppeteer reusing export-pdf infrastructure. Deferred from PDF export planning session.

7. **Add מצע links as parties publish them** — ישר!, הדמוקרטים, and ביחד now have accurate links. Monitor ש"ס, ליכוד, חד"ש for new/updated official platforms. Update `lib/parties.ts` + grounding entries' `provenance`/`platformAvailable` when links appear.

8. **Gemini paid tier: decide when to switch** — Currently on free tier (rate-limited). Baseline: ~$0.03/session (52K tokens, 11 calls). Trigger: ~200–300 daily users (~$180–270/mo). Primary cost driver is score-topics (40% of tokens); reducing party-platform excerpt size there cuts costs proportionally. Full analysis in `docs/API-COST-ANALYSIS.md`.

9. 💬 **DISCUSSION: Gamification option (watch — revisit if pattern grows)** — Single user (R4, 20yo woman) requested Kahoot-style design: sliders, visual ranking, less text. Too early to act; the depth/emotional resonance is what drives the strongest positive reactions. Revisit if this request appears in ≥2 more sessions.

10. **Topic chip / percentage divergence** — The v/~/x chip reflects only the opener pre-calibrated score (sign), while the final percentage blends in AI follow-up scoring (50/50). A party can show "x" yet score 65% if the follow-up probed an aspect where they partially aligned. Options: (a) derive chip from blended topic score instead of opener, (b) add tooltip explaining the divergence, (c) leave as-is and flag for advisor review. Revisit after next user-testing round.

11. **Scoring tuning: squared weights + critical-topic cap** — two related levers to make high-priority mismatches hit harder: (a) use weight² (16:9:4:1) instead of linear (4:3:2:1) so "קריטי" means more in the weighted average; (b) limit קריטי selections to 1–2 so users can't mark everything critical (making each designation genuinely selective). Both are low-lift and complementary; revisit after next user-testing round with real data. _[decided 2026-06-27: deferred, score curve already handles primary case]_

12. **Fix `quiz_abandoned` instrumentation gap** — Design doc claims it "fires on beforeunload / back navigation" but the code (`app/quiz/page.tsx:550`) only fires it from the priorities-screen back button; no `beforeunload` listener exists anywhere. Real mid-quiz abandonment (tab close, navigating away from a topic question) generates no event today. Not blocking — a funnel on `topic_completed`'s `topic_index` answers the core drop-off question without it — but should add a `beforeunload` handler + per-step abandon tracking for direct attribution. Found while building Mixpanel dashboards (2026-07-01).

13. **Replace misleading quiz-completion reports on Mixpanel dashboard** — "Topic-by-topic progression" (funnel on absolute `topic_index`) and "Selected vs. completed" (two averages) both conflate "selected fewer topics" with "dropped off," since `topic_count` varies per session. `topics_missed` property added to `quiz_completed` (`app/quiz/page.tsx`, deployed 2026-07-01) to fix this — once real sessions with the new property exist, replace both reports with one clean breakdown of `quiz_completed` count by `topics_missed` (0 = all completed, 1 = all but one, etc.) on dashboard `11325742`. Blocked on data: only applies to sessions after deploy.

14. **Expose source-provenance/concreteness tiering to end users** — Each grounding entry now carries `provenance` (official-current/official-outdated/joint-list/third-party) and `concreteness` (quantified/named-mechanism/specific-stance/generic) internally (`lib/groundings.ts`, 2026-07-03). Not shown in the UI yet — deliberately tabled by the user as a future consideration, not scoped or designed. Would need: deciding what an "export-grade" simplified label looks like for end users (the full enum is an internal detail), where it'd surface (per-quote badge in the grounding accordion? a party-level note only?), and whether it changes user trust/perception in testing. Revisit after the UX/UI review (#1) — this adds density, not less.

15. ⏸️ **Multi-language support** — _blocked on: MVP working in Hebrew_
    - Russian, Arabic, English UI layers
    - Party platforms remain in Hebrew; answers/explanations translated

16. ⏸️ **Candidate records extension** — _blocked on: v1 stable_
    - Experience, notable actions/votes (official sources only, no social media)

17. ⏸️ **Multi-country generalization** — _blocked on: Israel v1 validated_

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
