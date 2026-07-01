# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Follow-up neutrality fixes (advisor feedback)** — Broadened AI follow-up options from a hard 3–4 floor to 2–4 (no padding with a redundant option to hit 4). Diversified `TOPIC_KEY_DIMENSIONS` for security (was 4/4 Israeli-Arab/Palestinian-conflict aspects) and housing (was 1/1) using already-collected, previously-unused grounding data. Also found + logged (not yet fixed) a results-page grounding-quote display bug — see backlog #2. (2026-07-01)
- **Mixpanel dashboards + topics_missed tracking** — "Election Assistant — Core Analytics" board live in Production, 14 reports across Q1–Q7, built via the official Mixpanel MCP server. Lexicon display names applied project-wide. Added `topics_missed` to `quiz_completed` for a cleaner completion metric. (2026-07-01)
- **Opener answer options review (advisor feedback)** — Reviewed all 9 topics against advisor's "redundant 4th options, not opposed to each other" feedback. Cut security.autonomy, health.workforce, religion.rabbinate (merged into freedom's hint); replaced housing's periphery/middle with settlement/service-linked framings backed by real grounding data; reframed economy.growth as an explicit trickle-down claim. 3 reframed options scored directly against grounding data (ANTHROPIC_API_KEY unavailable). (2026-07-01)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

1. **Advisor review before MVP** — All 10 parties grounded + sourceQuality classified. ✅ (b) Opener-answer redundancy addressed — all 9 topics reviewed against advisor feedback, `docs/score-review.md`'s 8 weak discriminators either sharpened into real claims (grounding-backed) or cut. Still open: (a) advisor review of live app UX, (c) `sourceQuality` calls for חד"ש (official vs. thirdParty) and עוצמה (thirdParty vs. official — own 13 principles but supplemented with IDI/JVL).

2. **Fix grounding-quote display bug — results page can hide a party's real platform content** — Found live: ביחד (78%, #1 rank) showed no "מה כתוב במצע" quotes despite a full platform. Root cause: `buildGroundingsForParties` (`app/api/results/route.ts`) filters every party's topic quotes down to whichever single `aspect` tag got probed during the quiz — but aspect tags are ad-hoc per-party strings assigned during ingestion; only ~2-3/10 parties ever happen to share an identical tag (confirmed via `data/groundings/*.json`), so ~70-90% of parties get silently zeroed out on any topic where the follow-up landed on a non-shared tag. ✅ **Zero-cost stop-gap shipped** (`fix/grounding-quote-display-bug`): `buildGroundingsForParties` no longer hides unmatched entries — always shows a party's full topic content, with matched entries (aspect probed by the follow-up) flagged and sorted first, highlighted in the UI + PDF export. Still open: the underlying architecture decision below, needed to also improve follow-up dimension-selection quality (not just display).
   - (a) **Canonical per-topic taxonomy**: a small fixed sub-aspect enum per topic (~4-6 buckets), tagged onto every grounding entry via AI-assisted classification + human spot-check. Bigger lift (one-time tagging pass + ongoing discipline for new parties), but also improves follow-up dimension-selection quality independent of this bug.
   - (b) **AI tag-citation**: extend the existing `score-topics` call to also return, per party, which of *that party's own* aspect tags it actually used to justify the score. Exact-match within one party's own tag set — no cross-party standardization needed, no manual retagging, small output-size increase (tags are short slugs, not quotes) — measurable via existing Langfuse token tracking on this route.

4. 💬 **DISCUSSION: Depth vs. brevity strategic decision** — Recurring pattern across R1–R4: length/attention concern coexists with deep appreciation for depth and emotional resonance. Product positioning question before any UX changes: (a) accept depth + invest in targeting engaged voters, (b) progressive disclosure (short mode / full mode), (c) micro-UX only (make length feel shorter without removing content). Decision gates the UX/UI overhaul below.

5. 💬 **DISCUSSION: UX/UI review + overhaul** — Multiple round-4 users (and prior rounds) flagged "too much text", "too many options", headings not prominent enough. Warrants a dedicated UX discussion and systematic review of text density, visual hierarchy, typography, and interaction patterns across the quiz flow — even if core functionality stays the same. The text comments from testing are symptoms of a broader UX conversation we haven't had yet.

6. ✅ **"אודות" section** — Built: `/about` static page (lightweight scope, footer link). Content: builders (מאיה ואפרי נטל-שי), data sources, neutrality statement, privacy, feedback channels (widget + GitHub Issues). Advisor attribution placeholder pending review (TODO #1).

7. **Build MVP** — Active. Full scope in `docs/PHASED-ROADMAP.md`. Completed: 0.3 (grounding UI), 0.4 (security), 0.5 (quota degradation), 0.7 (scoring tests), 1.1 (remove prototype artifacts). Next: 1.8 soft launch iteration.

   _Next sessions:_
   - **1.8 (in progress)**: Soft launch underway — monitoring Langfuse, quota, mobile; iterating on feedback

   _Open decisions (discuss before implementing):_
   - ✅ **"ענית" for un-grounded topics** — resolved: show gray "—" chip for topics with no party data (chip row, not accordion). (2026-06-27)
   - ✅ **Feedback channel** — resolved: floating in-app widget → Slack #election-feedback. (2026-06-27)
   - ✅ **Analytics depth** — resolved: migrated to Mixpanel (EU, free tier), full funnel + priority distribution + topic engagement, dashboard live. Design in `docs/ANALYTICS-DESIGN.md`, board spec in `docs/MIXPANEL-DASHBOARDS.md`. (2026-06-28, dashboard built 2026-07-01)

   _Human tasks (parallel):_
   - **0.1** Advisor review of live app UX (opener-answer content addressed 2026-07-01, see TODO #1)
   - **0.6** Content neutrality audit (3rd-party review of question framing)
   - **0.8** Infrastructure: connect voteassist.me domain; set Vercel env vars (UPSTASH_*, GEMINI_API_KEY, LANGFUSE_*, NEXT_PUBLIC_FEEDBACK_FORM_URL)

8. **Open-source the repository** — Repo is currently private. Steps before going public: (a) audit git history for secrets (`gitleaks` / `trufflehog`), (b) review all comments and TODOs for anything not safe to publish, (c) add LICENSE (MIT or Apache), (d) clean up README for external audience, (e) run security re-assessment (see #9). Deferred to post-MVP per original decision.

9. **Security re-assessment** — Initial security review done (MVP phase 0.4). Re-validate before going public: API key exposure, input sanitization, rate limiting, dependency vulnerabilities (`npm audit`). May be run as part of open-source prep (#8) or independently beforehand.

10. **Graphical shareable card** — Single-screen image (≈600×400px) optimized for social/WhatsApp sharing: top match + score, 2-3 topic chips, branding. Complements the PDF export (different use case: "share a teaser" vs. "save full results"). Options: server-side canvas (Satori/`@vercel/og`), or screenshot crop from Puppeteer reusing export-pdf infrastructure. Deferred from PDF export planning session.

11. **Add מצע links as parties publish them** — ישר!, הדמוקרטים, and ביחד now have accurate links. Monitor ש"ס, ליכוד, חד"ש for new/updated official platforms. Update `lib/parties.ts` + grounding `sourceQuality`/`platformAvailable` when links appear.

12. **Gemini paid tier: decide when to switch** — Currently on free tier (rate-limited). Baseline: ~$0.03/session (52K tokens, 11 calls). Trigger: ~200–300 daily users (~$180–270/mo). Primary cost driver is score-topics (40% of tokens); reducing party-platform excerpt size there cuts costs proportionally. Full analysis in `docs/API-COST-ANALYSIS.md`.

13. 💬 **DISCUSSION: Gamification option (watch — revisit if pattern grows)** — Single user (R4, 20yo woman) requested Kahoot-style design: sliders, visual ranking, less text. Too early to act; the depth/emotional resonance is what drives the strongest positive reactions. Revisit if this request appears in ≥2 more sessions.

14. **Topic chip / percentage divergence** — The v/~/x chip reflects only the opener pre-calibrated score (sign), while the final percentage blends in AI follow-up scoring (50/50). A party can show "x" yet score 65% if the follow-up probed an aspect where they partially aligned. Options: (a) derive chip from blended topic score instead of opener, (b) add tooltip explaining the divergence, (c) leave as-is and flag for advisor review. Revisit after next user-testing round.

15. **Scoring tuning: squared weights + critical-topic cap** — two related levers to make high-priority mismatches hit harder: (a) use weight² (16:9:4:1) instead of linear (4:3:2:1) so "קריטי" means more in the weighted average; (b) limit קריטי selections to 1–2 so users can't mark everything critical (making each designation genuinely selective). Both are low-lift and complementary; revisit after next user-testing round with real data. _[decided 2026-06-27: deferred, score curve already handles primary case]_

16. **Fix `quiz_abandoned` instrumentation gap** — Design doc claims it "fires on beforeunload / back navigation" but the code (`app/quiz/page.tsx:550`) only fires it from the priorities-screen back button; no `beforeunload` listener exists anywhere. Real mid-quiz abandonment (tab close, navigating away from a topic question) generates no event today. Not blocking — a funnel on `topic_completed`'s `topic_index` answers the core drop-off question without it — but should add a `beforeunload` handler + per-step abandon tracking for direct attribution. Found while building Mixpanel dashboards (2026-07-01).

17. **Replace misleading quiz-completion reports on Mixpanel dashboard** — "Topic-by-topic progression" (funnel on absolute `topic_index`) and "Selected vs. completed" (two averages) both conflate "selected fewer topics" with "dropped off," since `topic_count` varies per session. `topics_missed` property added to `quiz_completed` (`app/quiz/page.tsx`, deployed 2026-07-01) to fix this — once real sessions with the new property exist, replace both reports with one clean breakdown of `quiz_completed` count by `topics_missed` (0 = all completed, 1 = all but one, etc.) on dashboard `11325742`. Blocked on data: only applies to sessions after deploy.

18. ⏸️ **Multi-language support** — _blocked on: MVP working in Hebrew_
    - Russian, Arabic, English UI layers
    - Party platforms remain in Hebrew; answers/explanations translated

19. ⏸️ **Candidate records extension** — _blocked on: v1 stable_
    - Experience, notable actions/votes (official sources only, no social media)

20. ⏸️ **Multi-country generalization** — _blocked on: Israel v1 validated_

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
