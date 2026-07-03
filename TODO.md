# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Fix: `lib/parties.ts` drifted from grounding data (party website/platform links), low-contrast text** — Hadash and Otzmah Yehudit both had a real official-current platform in grounding data but no `platformUrl` in `lib/parties.ts`, so results/PDF showed "ללא מצע רשמי" incorrectly; fixed both. Shas's `website` pointed to an unrelated senior-housing site — the "correct" domain (`shas.org.il`) turned out to be dead too (live `ECONNREFUSED`, last Wayback snapshot Nov 2022), so set to empty rather than link to either. Also darkened unreadable `text-gray-300` → `text-gray-500` for "אתר לא ידוע" in both the results page and PDF export. Recurrence of `VAA-DESIGN.md` item 63 — regression test proposed, not yet added (backlog #6). (2026-07-04)
- **Feature: distinguish Preview from Production deployments** — Vercel's `VERCEL_ENV` now drives a visible "גרסת Preview" bar (every screen) and Preview-aware native-share text, with zero footprint on production (verified via actual `VERCEL_ENV=production` build-output diffing, not just code review). Also the first session-driven Preview deployment via a feature branch (pushing `main` directly would have deployed to production instead). (2026-07-04)
- **Content: security/health/ecology opener sharpening, new Lebanon follow-up dimension, justice topic reorder** — Sharpened 3 opener options against grounding data (security `control`'s cost tradeoff, health `private`→mechanism-specific, ecology `economy`→`deregulation` naming actual regulations) with corresponding rescoring; added a new `lebanon-framework-and-hezbollah-disarmament` follow-up dimension after web research showed the June 2026 Israel-Lebanon framework's political alignment is orthogonal to the existing Palestinian-conflict axis (Likud backs it, Otzmah Yehudit/Eisenkot/Bennett-Lapid all oppose it, for different reasons) — folding it into the existing `peace` option would have produced an incoherent score. `justice` moved to 2nd priority position. Advisor-review doc generator now derives topic order from `lib/topics.ts` and pre-fills sub-dimension tables with live grounding-coverage counts. (2026-07-04)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

1. ✅ **"אודות" section** — Built: `/about` static page (lightweight scope, footer link). Content: builders (מאיה ואפרי נטל-שי), data sources, neutrality statement, privacy, feedback channels (widget + GitHub Issues). Advisor attribution placeholder still pending final wording review.

2. **Build MVP** — Active. Full scope in `docs/PHASED-ROADMAP.md`. Completed: 0.3 (grounding UI), 0.4 (security), 0.5 (quota degradation), 0.7 (scoring tests), 1.1 (remove prototype artifacts). Next: 1.8 soft launch iteration.

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

3. **Open-source the repository** — Repo is currently private. Steps before going public: (a) audit git history for secrets (`gitleaks` / `trufflehog`), (b) review all comments and TODOs for anything not safe to publish, (c) add LICENSE (MIT or Apache), (d) clean up README for external audience, (e) run security re-assessment (see #4). Deferred to post-MVP per original decision.

4. **Security re-assessment** — Initial security review done (MVP phase 0.4). Re-validate before going public: API key exposure, input sanitization, rate limiting, dependency vulnerabilities (`npm audit`). May be run as part of open-source prep (#3) or independently beforehand.

5. **Graphical shareable card** — Single-screen image (≈600×400px) optimized for social/WhatsApp sharing: top match + score, 2-3 topic chips, branding. Complements the PDF export (different use case: "share a teaser" vs. "save full results"). Options: server-side canvas (Satori/`@vercel/og`), or screenshot crop from Puppeteer reusing export-pdf infrastructure. Deferred from PDF export planning session.

6. **Add מצע links as parties publish them; add a `parties.ts`/grounding consistency test** — ישר!, הדמוקרטים, ביחד, חד"ש, and עוצמה יהודית now have accurate links (2026-07-04 fixed the latter two — both had `platformAvailable: true` in grounding with no `platformUrl` in `lib/parties.ts` at all). ש"ס has no official platform found at all — `shas.org.il` is confirmed dead (live `ECONNREFUSED`, Wayback last snapshot Nov 2022), `website` left empty. Monitor ליכוד for a new/updated official platform (currently only the 2016 party constitution). Second part: this drift (`VAA-DESIGN.md` item 63) has now recurred once — worth a regression test asserting the invariant (grounding `platformAvailable`/`sourceQuality: "official"` ⇒ `lib/parties.ts` has `platformUrl` set for that party) rather than relying on someone spotting it live again.

7. **Gemini paid tier: decide when to switch** — Currently on free tier (rate-limited). Baseline: ~$0.03/session (52K tokens, 11 calls). Trigger: ~200–300 daily users (~$180–270/mo). Primary cost driver is score-topics (40% of tokens); reducing party-platform excerpt size there cuts costs proportionally. Full analysis in `docs/API-COST-ANALYSIS.md`.

8. 💬 **DISCUSSION: Gamification option (watch — revisit if pattern grows)** — Single user (R4, 20yo woman) requested Kahoot-style design: sliders, visual ranking, less text. Too early to act; the depth/emotional resonance is what drives the strongest positive reactions. Revisit if this request appears in ≥2 more sessions.

9. **Topic chip / percentage divergence** — The v/~/x chip reflects only the opener pre-calibrated score (sign), while the final percentage blends in AI follow-up scoring (50/50). A party can show "x" yet score 65% if the follow-up probed an aspect where they partially aligned. Options: (a) derive chip from blended topic score instead of opener, (b) add tooltip explaining the divergence, (c) leave as-is and flag for advisor review. Revisit after next user-testing round.

10. **Scoring tuning: squared weights + critical-topic cap** — two related levers to make high-priority mismatches hit harder: (a) use weight² (16:9:4:1) instead of linear (4:3:2:1) so "קריטי" means more in the weighted average; (b) limit קריטי selections to 1–2 so users can't mark everything critical (making each designation genuinely selective). Both are low-lift and complementary; revisit after next user-testing round with real data. _[decided 2026-06-27: deferred, score curve already handles primary case]_

11. **Fix `quiz_abandoned` instrumentation gap** — Design doc claims it "fires on beforeunload / back navigation" but the code (`app/quiz/page.tsx:550`) only fires it from the priorities-screen back button; no `beforeunload` listener exists anywhere. Real mid-quiz abandonment (tab close, navigating away from a topic question) generates no event today. Not blocking — a funnel on `topic_completed`'s `topic_index` answers the core drop-off question without it — but should add a `beforeunload` handler + per-step abandon tracking for direct attribution. Found while building Mixpanel dashboards (2026-07-01).

12. **Replace misleading quiz-completion reports on Mixpanel dashboard** — "Topic-by-topic progression" (funnel on absolute `topic_index`) and "Selected vs. completed" (two averages) both conflate "selected fewer topics" with "dropped off," since `topic_count` varies per session. `topics_missed` property added to `quiz_completed` (`app/quiz/page.tsx`, deployed 2026-07-01) to fix this — once real sessions with the new property exist, replace both reports with one clean breakdown of `quiz_completed` count by `topics_missed` (0 = all completed, 1 = all but one, etc.) on dashboard `11325742`. Blocked on data: only applies to sessions after deploy.

13. **Expose source-provenance/concreteness tiering to end users** — Each grounding entry now carries `provenance` (official-current/official-outdated/joint-list/third-party) and `concreteness` (quantified/named-mechanism/specific-stance/generic) internally (`lib/groundings.ts`, 2026-07-03). Not shown in the UI yet — deliberately tabled by the user as a future consideration, not scoped or designed. Would need: deciding what an "export-grade" simplified label looks like for end users (the full enum is an internal detail), where it'd surface (per-quote badge in the grounding accordion? a party-level note only?), and whether it changes user trust/perception in testing. Revisit once concrete micro-copy/surgical UX fixes are underway (the broader UX/UI review this was blocked on concluded 2026-07-03 with no redesign adopted) — this adds density, not less.

14. ⏸️ **Multi-language support** — _blocked on: MVP working in Hebrew_
    - Russian, Arabic, English UI layers
    - Party platforms remain in Hebrew; answers/explanations translated

15. ⏸️ **Candidate records extension** — _blocked on: v1 stable_
    - Experience, notable actions/votes (official sources only, no social media)

16. ⏸️ **Multi-country generalization** — _blocked on: Israel v1 validated_

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
