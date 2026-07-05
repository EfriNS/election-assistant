# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Critical-topic priority gate + soft-launch fixes** — Real user feedback (2 sessions, root-caused via Langfuse+Mixpanel) showed marking multiple topics קריטי let a strong disagreement on one be outvoted by agreement on the others. Capped קריטי to 2 topics, scaled follow-up depth by priority weight, and added a real scoring gate (opposed party's score capped at 40% on a קריטי topic, surfaced via the existing grounding accordion reordered+highlighted). Resolved backlog #13. Diagnosed and hardened a production `/api/follow-up` JSON-parse error (retry-once, explicit gershayim prompt instruction, full error logging, token-budget bump) — confirmed via direct Gemini API reproduction to be a rare upstream glitch, not a config issue. Follow-up review from the same tester then found a second real issue: follow-up option sets could be one-sided (a right-leaning security answer made every left-leaning party's grounded territorial-policy position invisible) because dimension-selection and grounding were gated by "currently close parties" — extracted `selectSuggestedDimension()` to fix, confirmed via live API reproduction. (2026-07-05)
- **Pre-launch legal/privacy risk review — fully implemented** — "Lawyer's hat" review before publishing/open-sourcing, covering misquotation, undisclosed-influence/election-law exposure, and privacy law. Grounded in the actual code (found `data-hj-allow` recording free-text political-opinion answers via Hotjar) and current Israeli law (Amendment 13 to the Privacy Protection Law, in force since Aug 2025, names political opinions as specially-sensitive data) and a real precedent (mako's "מצפן הבחירות" cease-and-desist). Implemented all of it: new `/terms` (privacy policy naming every processor + terms of use + AS-IS clause), Hotjar fix, non-affiliation surfaced on the landing page, quote-dispute path + gated archive links + source-freshness display + score-interpretation framing, full-history secrets audit (zero findings), `SECURITY.md`. Removed an initial "5 business days" response commitment after user correction — a solo maintainer shouldn't promise an SLA. (2026-07-04)
- **`lib/parties.ts`/grounding consistency regression test** — `tests/partiesGroundingConsistency.test.ts` guards `VAA-DESIGN.md` item 63 (Hadash/Otzmah Yehudit both had `platformAvailable: true` in grounding with no `platformUrl` in `parties.ts` — the exact bug from the entry below). Verified it actually catches the regression (reverted, confirmed failure, restored). (2026-07-04)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

_Ordered by RICE thinking (reach × impact × confidence ÷ effort) — each item's rank note explains why, not a scored table. Full scope in `docs/PHASED-ROADMAP.md` where relevant._

1. **Soft launch iteration** — _Top priority: real users are on it right now, every other item waits on this._ Monitoring Langfuse, quota, and mobile behavior; iterating on live feedback. Active, ongoing (MVP phase 1.8).

2. **Open-source the repository** — _High impact (public credibility commitment), low remaining effort, self-imposed ~1-2 day deadline (2026-07-06ish)._ Repo is currently private. ✅ **Pre-flip requirements done (2026-07-06)**: (a) comment/TODO/docs safety audit — clean overall (no PII beyond generic tester labels, no party editorializing, no real secrets); redacted a few internal identifiers with no reason to be public (Mixpanel project/dashboard IDs, an internal Slack channel name, a CHANGELOG mention naming an unrelated prior project's internals); (b) README cleanup — fixed a stale rate-limit figure (said 10/day, actual limit raised to 100 months ago), added a Security section; (c) security re-assessment — found and fixed 4 real issues: deleted a dead unauthenticated `/api/chat` route (abandoned prototype), validated + rate-limited `/api/export-pdf` (was trusting raw client JSON with an unescaped-HTML injection point into a real headless-Chromium render), sanitized `/api/results`' free-text input, escaped Slack-mrkdwn injection in `/api/feedback`; also caught a real `.env.example` bug (documented `QUOTA_CRON_SECRET`, code reads `CRON_SECRET` — would've silently left `/api/quota-check` unauthenticated for anyone following the docs). Also did an unscoped repo structure/naming pass (kebab-case fix, removed a stale generated doc, scrubbed `docs/learnings/universal/` of unrelated-prior-project content). Considered a git-history rewrite or private-historical-repo split (old commits still contain pre-redaction versions) — decided to flip directly and keep full history intact (existing gitleaks audit already covers real secrets; remaining exposure is low-severity; real history has its own credibility value). Full writeup: CHANGELOG.md 2026-07-06. Already done earlier: secrets audit (`gitleaks detect --log-opts="--all"`, 279 commits/all refs, zero findings, 2026-07-04), LICENSE (MIT). **Remaining**: flip repo visibility to public (manual step), then the checklist below.
   **Immediately after flipping to public** (risk-review findings 2.1/2.2/3.2, 2026-07-04 — built gated/soft specifically because the repo was still private at the time):
   - Flip `GROUNDING_ARCHIVE_PUBLIC` to `true` in `lib/groundings.ts` — every quote's archive link (`docs/sources/*.md`) goes live immediately, no other code change needed.
   - Update `/terms`'s "בכוונתנו לפרסם את קוד הכלי בפומבי..." line (`app/terms/page.tsx`) — it's future-tense on purpose right now; reword once true.
   - Spot-check that the existing GitHub links in `/about` and the landing-page footer actually resolve now.
   - Enable "Private vulnerability reporting" in repo Settings → Security (`SECURITY.md` already points there; the enable API 404'd while the repo was private — confirm once public).

3. **Content neutrality audit** (human task, not code) — _High impact — neutrality is the core value proposition, and this is the one open item that would directly validate it — but needs a 3rd party, not just dev time._ 3rd-party review of question framing. Note: a real instance of this exact risk class (dynamically-generated follow-up options one-sidedly excluding a real political position) was found and fixed 2026-07-05 via user feedback — this was AI-generated-content bias, not static question wording, but underscores that representativeness bugs are real and worth a dedicated audit, not just ad-hoc fixes as they're reported.

4. **Graphical shareable card** — _Good reach (every share action), medium effort, well-scoped, two clear implementation paths already identified._ Single-screen image (≈600×400px) optimized for social/WhatsApp sharing: top match + score, 2-3 topic chips, branding. Complements the PDF export ("share a teaser" vs. "save full results"). Options: server-side canvas (Satori/`@vercel/og`), or screenshot crop from Puppeteer reusing export-pdf infrastructure.

5. **Fix `quiz_abandoned` instrumentation gap** — _Low effort (one `beforeunload` handler), clear value, not urgent since a funnel workaround already exists._ Design doc claims it "fires on beforeunload / back navigation" but the code (`app/quiz/page.tsx:550`) only fires it from the priorities-screen back button — real mid-quiz abandonment (tab close, navigating away mid-topic) generates no event today. A funnel on `topic_completed`'s `topic_index` answers the core drop-off question without it, but a real `beforeunload` handler + per-step tracking would give direct attribution. Found while building Mixpanel dashboards (2026-07-01).

6. **Topic chip / percentage divergence** — _Affects trust on every result view (a party can show "✕" yet score 65%), but needs a design decision (a/c below) before the fix itself is small._ The chip reflects only the opener pre-calibrated score (sign); the percentage blends in AI follow-up scoring (50/50). Chip now shows its own % value inline, not just on hover (2026-07-05) — reduces but doesn't resolve the underlying divergence. Remaining options: (a) derive chip from blended topic score instead of opener, (c) leave as-is and flag for advisor review. Revisit after next user-testing round.

7. **Finalize "אודות" advisor-attribution wording** — _Tiny effort, just been sitting open._ `/about` is built and live; only the advisor-attribution placeholder still needs final wording review.

8. **Expose source-provenance/concreteness tiering to end users** — _Real reach (every grounding quote) but low confidence right now — needs a design decision and user-testing validation before it's even scoped, and risks adding density rather than reducing it._ Each grounding entry carries `provenance`/`concreteness` internally (`lib/groundings.ts`) but nothing surfaces it in the UI. Would need: an "export-grade" simplified label for end users, a decision on where it'd surface (per-quote badge? party-level note?), and validation that it helps rather than clutters. Revisit now that the broader UX/UI review concluded (2026-07-03, no redesign adopted) and micro-copy/surgical fixes are the active mode.

9. **Replace misleading quiz-completion reports on Mixpanel dashboard** — _Blocked on data: needs real post-deploy sessions with the `topics_missed` property before this is actionable, regardless of priority._ "Topic-by-topic progression" and "Selected vs. completed" both conflate "selected fewer topics" with "dropped off," since `topic_count` varies per session. `topics_missed` property already added to `quiz_completed` (deployed 2026-07-01) — once enough post-deploy sessions exist, replace both reports with one breakdown of `quiz_completed` count by `topics_missed` on dashboard `11325742`.

10. **Monitor ליכוד and ש"ס for a newly-published official platform** — _Trivial recurring check, no dev effort, no urgency._ ליכוד currently has only the 2016 party constitution; ש"ס has no official platform found at all (`shas.org.il` confirmed dead — see `VAA-DESIGN.md` item 72). Update `lib/parties.ts` + grounding entries if either publishes something new; `tests/partiesGroundingConsistency.test.ts` will catch a missed `platformUrl` if grounding is updated but the link isn't.

11. **Gemini paid tier: decide when to switch** — _Not yet at the usage trigger — revisit when it's actually relevant, not before._ Currently on free tier (rate-limited). Baseline: ~$0.03/session (52K tokens, 11 calls). Trigger: ~200–300 daily users (~$180–270/mo). Full analysis in `docs/API-COST-ANALYSIS.md`.

12. 💬 **DISCUSSION: Gamification option (watch — revisit if pattern grows)** — _Single data point so far — explicitly not enough signal to act on yet._ One user (R4, 20yo woman) requested Kahoot-style design: sliders, visual ranking, less text. The depth/emotional resonance is what drives the strongest positive reactions elsewhere, so this isn't a quick win. Revisit if the request appears in ≥2 more sessions.

13. **Tune critical-topic gate constants (`MAX_CRITICAL_TOPICS=2`, `GATE_SCORE_CAP=40`) with real usage** — _Single data point so far (the feedback that drove the feature) — not enough signal yet to retune, just watch._ Both are reasoned defaults, not validated against a range of real sessions. Revisit if soft-launch feedback suggests the cap is too aggressive/lenient, or if users routinely try to mark more than 2 topics קריטי.

14. 💬 **DISCUSSION: `docs/learnings/` token bloat — consolidate content, consider Skills for `universal/` (tabled 2026-07-06)** — _No urgency, deliberately tabled to focus on the open-source flip — revisit as a dedicated session, not a quick add-on._ `docs/learnings/` is ~3,600 lines / ~254KB across `INDEX.md` + 14 topic files (~60K tokens if all loaded at once); a normal `/start` alone (reads `INDEX.md` + 1-2 topic files) already pulls ~10-15K tokens of learnings before any real work starts.
    - **Searched for prior guidance, found none**: checked sibling repos (Contendre, cv-refinery, claude-code-template, organize-my-docs) for a remembered "consolidation instructions" doc — not found. The template's actual stated policy is the opposite direction ("split a file if it grows past ~500 lines"). `INDEX.md` already claims an aspirational "distilled insights, not narratives" principle it doesn't enforce. Worth asking the user again for a sharper pointer to what they were recalling, in case the search missed the real term.
    - **Root cause of the bloat**: `universal/` mixes real reusable principles with (a) many items inherited unaudited from an unrelated prior template project (dates predate this project entirely, 2025-10 through 2025-12), and (b) duplication the files already self-acknowledge via `[Cross-cutting: X]` tags and a whole "Cross-Cutting Themes" section restating the same handful of ideas across CODING-PRINCIPLES/ARCHITECTURE/DEBUGGING/TESTING/PROCESS. `INDEX.md`'s own "Previously: ..." session-log tail is an unbounded, ever-growing mini-changelog duplicating the real `CHANGELOG.md` — and it's the one file read almost every session regardless of topic.
    - **Idea explored (not decided)**: convert each `universal/` topic area (coding-principles, architecture, debugging, testing, process, ci-cd, ai-prompts) into a Skill instead of a plain markdown file. Skills are lazy-loaded — only the name+one-line description sit in the ambient skill list until actually invoked — versus today's design, where CLAUDE.md's 🛑 STOP boxes assume the file is already in context or get reflexively re-read, and `/start` proactively guesses one topic file to load based on the TODO item's type. A skill's `description` field is a more robust "when to invoke" trigger than a hardcoded reminder, and a `SKILL.md` + `references/` structure enables real progressive disclosure (lean top-level, deep detail only on demand) — the same shape as already-installed skills here (`claude-api`, `dataviz`).
    - **Important caveat**: Skills would solve *when/whether* content loads (selectivity), not content density — the actual consolidation (merging duplicates, pruning stale template-inherited items never once cited in a real election-assistant session) is separate work needed regardless of storage format. Don't treat "convert to skills" as a substitute for the editorial pass.
    - **Scope lean (not decided)**: `universal/` → good skill candidates (portable across projects, like the shape of `claude-api`/`dataviz`). `project/` (`VAA-DESIGN.md` etc.) → keep as plain browsable files, not skill-ified — it's historical incident-log memory to skim, not a "stop and check before doing X" trigger.
    - **Suggested next step if revisited**: sketch one skill (e.g. "coding-principles" — `SKILL.md` body + trigger description) as a prototype before committing to converting all 6-7 areas.

15. ⏸️ **Multi-language support** — _Large scope (a full i18n layer) is why this ranks low, not the original blocker — the Hebrew MVP has been live in soft launch for over a week, so "blocked on MVP working in Hebrew" is arguably already satisfied. Revisit once the repo is public and soft launch stabilizes, not before._
    - Russian, Arabic, English UI layers; party platforms stay in Hebrew, answers/explanations translated

16. ⏸️ **Candidate records extension** — _blocked on: v1 stable (still actively iterating during soft launch)_ — experience, notable actions/votes (official sources only, no social media)

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
All resolved by what shipped: technical approach (hybrid), tone/style (formal/personal, user-selectable, live), question depth (short/deep across 9 topics), ingestion pipeline (manual `collect-party-data` skill, no admin UI needed). Open-sourcing timing is in progress — see Backlog #2.

### Future Ideas
- Candidate profile pages (experience, voting record)
- Multi-country support (architecture to be designed with this in mind)
- Shareable results ("Here's why I'm voting for X")
- Embeddable widget for civic organizations
- "How did the parties perform on their promises?" (post-election retrospective)

### Reference Material
- Screenshots/ — Der Spiegel Hamburg election quiz (UX reference)
- README.md — Project overview, setup, tech stack
