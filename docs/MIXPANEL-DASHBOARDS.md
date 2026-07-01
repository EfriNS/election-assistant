# Mixpanel Dashboards — Election Assistant

_Built: 2026-07-01. Companion to `docs/ANALYTICS-DESIGN.md` (event schema, product questions Q1–Q7)._

---

## Board: "Election Assistant — Core Analytics"

- **Project**: Production (4038344), EU region
- **Dashboard ID**: `11325742`
- **URL**: https://eu.mixpanel.com/project/4038344/app/boards#id=11325742
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

5. **The pre-existing "🌱 Starter Board"** (dashboard id `11314796`) is separate from this board — don't confuse the two. It has Mixpanel's default templates (Active Users, Retention) plus a recreated "Total active users" (all-time unique `$session_start`, report id `91100171`) after an accidental move-and-delete during this session.

---

## What's NOT Automatable Here

Mixpanel's public REST API is read/write for events and query data, but dashboard/bookmark management goes through their *internal* app API (same one the web UI uses) via the MCP server — there's no independently documented, stable contract for it. Treat the gotchas above as living knowledge, not a permanent guarantee; Mixpanel could change this internal behavior without notice.
