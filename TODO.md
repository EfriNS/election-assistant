# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Claude tooling migrated to the dev-workflow plugin; learnings consolidated** — Resolved the tabled learnings-token-bloat item (was backlog #13): universal commands/skills/learnings now come from the `dev-workflow` plugin (`claude-code-template` repo), universal/ learnings distilled into 6 lazy-loaded skills, INDEX.md cut to a thin project map, CLAUDE.md gained model tiering (haiku for /build /test /ci, opus for judgment-heavy work), product-review rebuilt as model-tiered agents. Net −6,650 lines here; follow-ups tracked in claude-code-template's TODO. (2026-07-07)
- **Open-sourced the repository — repo is now public** — Pre-flip: comment/docs safety audit (redacted internal identifiers with no reason to be public), README cleanup, security re-assessment (4 real fixes, most notably an HTML-injection point in `/api/export-pdf` and a dead unauthenticated `/api/chat` route), plus an unscoped repo structure/naming pass. Post-flip: `GROUNDING_ARCHIVE_PUBLIC` → `true`, `/terms` reworded to present tense with live links, all GitHub URLs spot-checked (200), private vulnerability reporting enabled. Considered a git-history rewrite/private-historical-repo split, decided to flip directly and keep full history intact. Full detail: CHANGELOG.md 2026-07-06 (two entries). (2026-07-06)
- **Critical-topic priority gate + soft-launch fixes** — Real user feedback (2 sessions, root-caused via Langfuse+Mixpanel) showed marking multiple topics קריטי let a strong disagreement on one be outvoted by agreement on the others. Capped קריטי to 2 topics, scaled follow-up depth by priority weight, and added a real scoring gate (opposed party's score capped at 40% on a קריטי topic, surfaced via the existing grounding accordion reordered+highlighted). Resolved backlog #13. Diagnosed and hardened a production `/api/follow-up` JSON-parse error (retry-once, explicit gershayim prompt instruction, full error logging, token-budget bump) — confirmed via direct Gemini API reproduction to be a rare upstream glitch, not a config issue. Follow-up review from the same tester then found a second real issue: follow-up option sets could be one-sided (a right-leaning security answer made every left-leaning party's grounded territorial-policy position invisible) because dimension-selection and grounding were gated by "currently close parties" — extracted `selectSuggestedDimension()` to fix, confirmed via live API reproduction. (2026-07-05)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

_Ordered by RICE thinking (reach × impact × confidence ÷ effort) — each item's rank note explains why, not a scored table. Full scope in `docs/PHASED-ROADMAP.md` where relevant._

1. **Soft launch iteration** — _Top priority: real users are on it right now, every other item waits on this._ Monitoring Langfuse, quota, and mobile behavior; iterating on live feedback. Active, ongoing (MVP phase 1.8).

2. **Content neutrality audit** (human task, not code) — _High impact — neutrality is the core value proposition, and this is the one open item that would directly validate it — but needs a 3rd party, not just dev time._ 3rd-party review of question framing. Note: a real instance of this exact risk class (dynamically-generated follow-up options one-sidedly excluding a real political position) was found and fixed 2026-07-05 via user feedback — this was AI-generated-content bias, not static question wording, but underscores that representativeness bugs are real and worth a dedicated audit, not just ad-hoc fixes as they're reported.

3. **Graphical shareable card** — _Good reach (every share action), medium effort, well-scoped, two clear implementation paths already identified._ Single-screen image (≈600×400px) optimized for social/WhatsApp sharing: top match + score, 2-3 topic chips, branding. Complements the PDF export ("share a teaser" vs. "save full results"). Options: server-side canvas (Satori/`@vercel/og`), or screenshot crop from Puppeteer reusing export-pdf infrastructure.

4. **Fix `quiz_abandoned` instrumentation gap** — _Low effort (one `beforeunload` handler), clear value, not urgent since a funnel workaround already exists._ Design doc claims it "fires on beforeunload / back navigation" but the code (`app/quiz/page.tsx:550`) only fires it from the priorities-screen back button — real mid-quiz abandonment (tab close, navigating away mid-topic) generates no event today. A funnel on `topic_completed`'s `topic_index` answers the core drop-off question without it, but a real `beforeunload` handler + per-step tracking would give direct attribution. Found while building Mixpanel dashboards (2026-07-01).

5. **Topic chip / percentage divergence** — _Affects trust on every result view (a party can show "✕" yet score 65%), but needs a design decision (a/c below) before the fix itself is small._ The chip reflects only the opener pre-calibrated score (sign); the percentage blends in AI follow-up scoring (50/50). Chip now shows its own % value inline, not just on hover (2026-07-05) — reduces but doesn't resolve the underlying divergence. Remaining options: (a) derive chip from blended topic score instead of opener, (c) leave as-is and flag for advisor review. Revisit after next user-testing round.

6. **Finalize "אודות" advisor-attribution wording** — _Tiny effort, just been sitting open._ `/about` is built and live; only the advisor-attribution placeholder still needs final wording review.

7. **Expose source-provenance/concreteness tiering to end users** — _Real reach (every grounding quote) but low confidence right now — needs a design decision and user-testing validation before it's even scoped, and risks adding density rather than reducing it._ Each grounding entry carries `provenance`/`concreteness` internally (`lib/groundings.ts`) but nothing surfaces it in the UI. Would need: an "export-grade" simplified label for end users, a decision on where it'd surface (per-quote badge? party-level note?), and validation that it helps rather than clutters. Revisit now that the broader UX/UI review concluded (2026-07-03, no redesign adopted) and micro-copy/surgical fixes are the active mode.

8. **Replace misleading quiz-completion reports on Mixpanel dashboard** — _Blocked on data: needs real post-deploy sessions with the `topics_missed` property before this is actionable, regardless of priority._ "Topic-by-topic progression" and "Selected vs. completed" both conflate "selected fewer topics" with "dropped off," since `topic_count` varies per session. `topics_missed` property already added to `quiz_completed` (deployed 2026-07-01) — once enough post-deploy sessions exist, replace both reports with one breakdown of `quiz_completed` count by `topics_missed` on dashboard `11325742`.

9. **Monitor ליכוד and ש"ס for a newly-published official platform** — _Trivial recurring check, no dev effort, no urgency._ ליכוד currently has only the 2016 party constitution; ש"ס has no official platform found at all (`shas.org.il` confirmed dead — see `VAA-DESIGN.md` item 72). Update `lib/parties.ts` + grounding entries if either publishes something new; `tests/partiesGroundingConsistency.test.ts` will catch a missed `platformUrl` if grounding is updated but the link isn't.

10. **Gemini paid tier: decide when to switch** — _Not yet at the usage trigger — revisit when it's actually relevant, not before._ Currently on free tier (rate-limited). Baseline: ~$0.03/session (52K tokens, 11 calls). Trigger: ~200–300 daily users (~$180–270/mo). Full analysis in `docs/API-COST-ANALYSIS.md`.

11. 💬 **DISCUSSION: Gamification option (watch — revisit if pattern grows)** — _Single data point so far — explicitly not enough signal to act on yet._ One user (R4, 20yo woman) requested Kahoot-style design: sliders, visual ranking, less text. The depth/emotional resonance is what drives the strongest positive reactions elsewhere, so this isn't a quick win. Revisit if the request appears in ≥2 more sessions.

12. **Tune critical-topic gate constants (`MAX_CRITICAL_TOPICS=2`, `GATE_SCORE_CAP=40`) with real usage** — _Single data point so far (the feedback that drove the feature) — not enough signal yet to retune, just watch._ Both are reasoned defaults, not validated against a range of real sessions. Revisit if soft-launch feedback suggests the cap is too aggressive/lenient, or if users routinely try to mark more than 2 topics קריטי.

13. ⏸️ **Multi-language support** — _Large scope (a full i18n layer) is why this ranks low, not the original blocker — the Hebrew MVP has been live in soft launch for over a week, so "blocked on MVP working in Hebrew" is arguably already satisfied. Revisit once the repo is public and soft launch stabilizes, not before._
    - Russian, Arabic, English UI layers; party platforms stay in Hebrew, answers/explanations translated

14. ⏸️ **Candidate records extension** — _blocked on: v1 stable (still actively iterating during soft launch)_ — experience, notable actions/votes (official sources only, no social media)

15. ⏸️ **Multi-country generalization** — _blocked on: Israel v1 validated_

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
- **Transparency**: Open-sourced on GitHub for credibility (2026-07-06)
- **Cost model**: API-based → builder pays; must rate-limit and cap costs

### Open Questions
All resolved by what shipped: technical approach (hybrid), tone/style (formal/personal, user-selectable, live), question depth (short/deep across 9 topics), ingestion pipeline (manual `collect-party-data` skill, no admin UI needed), open-sourcing (repo went public 2026-07-06).

### Future Ideas
- Candidate profile pages (experience, voting record)
- Multi-country support (architecture to be designed with this in mind)
- Shareable results ("Here's why I'm voting for X")
- Embeddable widget for civic organizations
- "How did the parties perform on their promises?" (post-election retrospective)

### Reference Material
- Screenshots/ — Der Spiegel Hamburg election quiz (UX reference)
- README.md — Project overview, setup, tech stack
