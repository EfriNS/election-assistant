# Mixpanel Dashboards — Election Assistant

_Built: 2026-07-01. Companion to `docs/ANALYTICS-DESIGN.md` (event schema, product questions Q1–Q7)._

---

## Board: "Election Assistant — Core Analytics"

- **Project**: Production, EU region
- Structure mirrors `ANALYTICS-DESIGN.md`'s Q1–Q7 exactly: one text header per question, followed by its report(s).

Built via the official Mixpanel MCP server (`https://mcp-eu.mixpanel.com/mcp`, added with `claude mcp add --transport http mixpanel https://mcp-eu.mixpanel.com/mcp`), not the Mixpanel UI directly.

---

## Report Spec (14 reports)

### Q1 — Is the funnel working?
- **Core completion funnel** (funnel, steps): `quiz_session_init → priorities_submitted → topic_completed → quiz_completed`. Breakdown: `tone`, `depth`. Conversion window: session.
- **Topic-by-topic progression** (funnel, steps): 9 steps, each `topic_completed` filtered to `topic_index = 0..8`. Shows the survival curve independent of which specific topic a user got at each position. Conversion window: session.

### Q2 — Is the quiz the right length?
- **Topics selected per session** (insights, bar): `priorities_submitted` total count, breakdown by `topic_count`.
- **Selected vs. completed** (insights, bar): `quiz_completed`, average of `topics_selected` and average of `topics_completed` as two metrics.

### Q3 — How are priorities distributed?
- **Priority bucket distribution** (insights, bar): `priorities_submitted`, average of `critical_count`/`very_important_count`/`important_count`/`low_count`.
- **Critical marks by topic** (insights, bar): `priorities_submitted` total count, one metric per topic filtered to `{topic}_bucket = 4` (security, economy, housing, education, health, religion, justice, equality, ecology). All 9 metrics use the same event, so Mixpanel labels them generically **A–I** rather than by topic — the fixed order is **A=Security, B=Economy, C=Housing, D=Education, E=Health, F=Religion, G=Justice, H=Equality, I=Ecology**.

### Q4 — Is the content calibrated?
- **Free-text opener rate by topic** (insights, bar): `topic_completed`, average of `opener_was_free_text`, breakdown by `topic_id`. Since `opener_was_free_text` is a 0/1 boolean, its average *is* the fraction directly — 0.29 = 29% of that topic's opener answers were free-text (vs. multiple-choice). The blank/overall row aggregates across all topics.
- **Follow-up depth by topic** (insights, table): `topic_completed`, average of `follow_up_count`, breakdown by `topic_id` + `depth`.
- **Aspects probed** (insights, bar): `topic_completed` total count, breakdown by `aspects_probed` (list property — Mixpanel expands each value into its own row). This tracks which follow-up question "aspect" (party-platform dimension) got covered per topic — e.g. security → `two-state-solution`, economy → `progressive-taxation` (see `TOPIC_KEY_DIMENSIONS` in `lib/questions.ts`). Populated from the AI's `targetedAspect` choice on each follow-up (`app/quiz/page.tsx`), so it's directly tied to follow-ups, not the opener. **`(empty list)` = `topic_completed` events where zero aspects were covered** — either no follow-up was asked, or the topic had no grounding data to target. A high `(empty list)` count on a topic is the "AI not engaging" signal from Q4 above.

### Q5 — Are personalization choices meaningful?
- **Follow-up count by depth** (insights, bar): `topic_completed`, average of `follow_up_count`, breakdown by `depth`.
- **Completion by tone** (funnel, steps): same 4-step funnel as Q1, breakdown by `tone` only (isolates tone's effect from depth).

### Q6 — Are results useful?
- **Top party distribution** (insights, bar): `results_viewed` total count, breakdown by `top_party`.
- **Score spread (top 3)** (insights, line, daily): `results_viewed`, average of `score_spread_top3` = (top match score) − (3rd match score). High spread = a clear front-runner recommendation; low spread = the top 3 parties are close together (a "muddy", harder-to-act-on result).

### Q7 — Are there operational problems?
- **API errors over time** (insights, line, daily): `api_error` total count, breakdown by `endpoint` + `error_code`. Will show empty until the first `api_error` event fires — Mixpanel doesn't backfill/predict, and the event has never occurred in Production as of this writing.

---

## Lexicon (friendly display names)

Applied via `Bulk-Edit-Events`/`Edit-Property` so labels are readable everywhere in Mixpanel, not just this dashboard: `quiz_session_init` → "Quiz Started", `topic_completed` → "Topic Completed", etc. (6 of 7 events — `api_error` isn't in Lexicon yet since it hasn't fired). All ~47 custom event properties also have display names (e.g. `security_bucket` → "Security Priority", `score_hadash` → "Score: Hadash").

`Bulk-Edit-Events`/`Bulk-Edit-Properties` (the bulk tools) failed consistently with a generic error — had to fall back to the singular `Edit-Event`/`Edit-Property` tools, one call per item.

---

## Known Gotchas (for future sessions)

1. **Free tier caps saved reports at 5, hard limit — not a rate limit.** We hit this after the 5th report; waiting didn't help. Resolved by upgrading to Growth plan (usage-based above the free 1M events/month; negligible cost at this project's volume of 50–200 sessions/month).

2. **`Update-Dashboard` error responses are unreliable — often false negatives.** Many calls that reported `"Unexpected error in Update-Dashboard"` or `"Row 'X' not found in dashboard layout"` had actually succeeded server-side. **Always verify with `Get-Dashboard` (`include_layout=true`) after every mutation — never trust the tool's own success/error signal.** Occasionally calls do genuinely fail with zero effect; the only way to tell the difference is to check actual state.

3. **`query_id` from `Run-Query` should be attached immediately.** Letting time pass between generating a query and attaching it via `Update-Dashboard` risks the reference going stale. Run `Run-Query` and the corresponding `Update-Dashboard` call back-to-back, one report at a time — don't batch many `Run-Query` calls followed by a delayed bulk attach.

4. **Adding many new rows in a single `Update-Dashboard` call is unreliable.** A 19-row batch add partially applied (6 rows) then silently stopped. Add one row at a time and verify each before moving to the next.

5. **The pre-existing "🌱 Starter Board"** is separate from this board — don't confuse the two. It has Mixpanel's default templates (Active Users, Retention) plus a recreated "Total active users" (all-time unique `$session_start`) after an accidental move-and-delete during this session.

---

## Round 2 Report Plan (2026-07-10) — Phase 2 executed, see status marks

_From the data-analyst review (see ANALYTICS-DESIGN.md Round 2). The collection side shipped in `feature/mixpanel-analytics-round2`. Phase 2 was executed 2026-07-10 (post-restart session) — status marked per item below. **Incident**: mid-execution, a text-header-cell add left board 11325742 unreadable via the MCP's `Get-Dashboard` (every read errors; `List-Dashboards` works; layout is intact server-side — the board still duplicates). Recovery is via the web UI: check the board renders, delete any stray "Context — volume & completion trend" text row, and verify/drag row order (intended: context row top; 4 variant funnels under the core funnel). Do not keep mutating an unreadable board via MCP._

Baseline at review time (30d, 32 sessions): funnel 32 → 27 (84%) → 18 (67%) → 11 completed (34% overall); ~45s on priorities, ~11–12 min to complete; 14/27 sessions selected all 9 topics; survival curve shows gradual attrition, no cliff.

### Phase 2 — works on existing data (executed 2026-07-10)

1. ✅ **Q1: four per-variant funnels** (user-requested): reports 91328275 (formal/short) + 91328355 (formal/deep) in row `eEZoqDiS`, 91328385 (personal/short) + 91328418 (personal/deep) in row `gVwX5xqN`. Same 4 steps, session window, two global filters each. Existing overall funnel kept. formal/deep had only 3 sessions/30d at build time — expect noise until launch volume.
2. ✅ **Q2: "Topics selected per session" sorted 1→9** (user-requested): cell `oCuZt8Ui` updated in place with a numeric-bucket breakdown (min 1, max 10, size 1, per-value groups — max 10 so 9 gets its own bucket instead of a ">= 9" overflow group).
3. ✅ **Q2: "Selected vs completed" replaced** with **"Completion rate by topics selected"** (cell `BHJQXEjD`): `priorities_submitted → quiz_completed` funnel bucketed `intervals: [6,9]` → <6 / 6–<9 / ≥9. First read (30d, n=27): ≥9 topics = 50% completion, 6–8 = 44%, **3–5 = 0% (0 of 4)** — the light selectors abandoned, opposite of the "long quiz kills completion" hypothesis. Small n; watch.
4b. ✅ **Q1 survival rebuilt per cohort (2026-07-10, later)**: "Topic-by-topic survival by topics selected" (report 91092898) — 9 topic_index steps broken down by `total_topics` (per-value buckets), one survival curve per N-selected cohort. Read each segment only up to its own N (beyond N is structurally zero, not drop-off). Replaced the interim "(7+ selected)" filter version after user feedback.
4c. ⏳ **Two cell updates repeatedly failed for real** (bookmark `modified` never moved — not the usual false-negative): (a) upgrading "Topics missed by completers" (91338944) to the stacked topics_selected × topics_missed view — built query: https://eu.mixpanel.com/project/4038344/view/4534612/app/insights#em9Q4KTs6zcE — open, then save over the existing report; (b) "Follow-up depth by topic" (91100366) description explaining that values are counts and any "% of overall" badge (e.g. 134%) is segment-vs-overall-average, a UI display layer — edit the description in the UI.
4d. ✅ **"Free-text opener rate by topic"** now displays % directly (×100 formula); the "277.5%" a user saw was the relative-to-overall badge, not a rate.
4. ⚠️ **Context row**: "Sessions per day" (report 91328451, row `c73G95T3`) ✅. "Completion rate over time" cell attach unverified (the board became unreadable before verification — check in UI). The text header add is what corrupted the read path — **skip text headers for this row**; the report names are self-explanatory. Row placement (top of board) unverified — drag in UI if needed.

### Phase 3 — needs R2 events in production first (Lexicon gotcha: properties must fire before they're usable in reports)

5. **Q3: replace "Critical marks by topic" (A–I letters)** with `priorities_submitted` total, breakdown by the `critical_topics` list property — real topic names, one metric. Note the cutover date in the description (list props exist only from 2026-07-10).
6. **Q4: "AI not engaging rate"**: % of `topic_completed` with `follow_up_count = 0` **and** `skipped_follow_up = false`, by topic — now an honest signal (pre-R2 it conflated user skips).
7. **Q4: skip rate by topic / question type**: `question_answered` filtered `answer_mode = skip`, breakdown by `topic_id` + `question_type`.
8. **Q1: question-grain drop-off**: `question_answered` count by `question_type` + `follow_up_index` — where mid-topic stalls happen.
9. **Q6: results engagement**: `results_interaction` total, breakdown by `action`; separately `grounding_expanded` by `party_rank` (the "see details" discoverability signal).
10. **Q6: decisiveness trend**: `results_viewed` average `score_spread_top2` (line, daily) next to the existing top-3 spread; optionally breakdown by `ai_scoring_used`.
11. **Q5/Q6: perceived latency**: `results_ai_loaded` average `seconds_to_load` + `results_viewed` average `seconds_to_results` (line, daily) — quantifies the "loading feels frozen" complaint from user-testing round 4.
12. **Hesitation report** (behavioral session-recording replacement): `question_answered` average `switch_count` + average `seconds_on_question`, breakdown by `question_type` (optionally `topic_id`) — which questions make users waver.
13. **Back-navigation rate**: `navigated_back` total by `from_question_type` + `topic_id` — the navigation-confusion signal from user testing.
14. **Explainer usage**: `hint_opened` total by `label`; plus `about_viewed` daily count.
15. **Results dwell**: `results_exit` average `seconds_on_results` (tab-close exits; in-app exits derivable from `back_to_quiz`/`go_home_confirmed` timestamps).
16. **Lexicon**: add display names for the 10 new events + new properties once they've fired in production (run one real quiz post-deploy to seed them, or wait for organic traffic).

---

## What's NOT Automatable Here

Mixpanel's public REST API is read/write for events and query data, but dashboard/bookmark management goes through their *internal* app API (same one the web UI uses) via the MCP server — there's no independently documented, stable contract for it. Treat the gotchas above as living knowledge, not a permanent guarantee; Mixpanel could change this internal behavior without notice.
