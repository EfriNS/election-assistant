# Analytics Design — Election Assistant

_Decided: 2026-06-28. Implemented in `feature/mixpanel-analytics`._
_Round 2 (2026-07-10, `feature/mixpanel-analytics-round2`): data-analyst review added question-grain events, results-engagement events, timing props, list-format priority props, and fixed the follow-up-skip data bug (see Event Schema below)._

---

## Why We Did This

Post soft-launch, the existing 4 Vercel Analytics lifecycle events were too coarse to answer the questions we actually care about. We needed session-level joining, funnel analysis, and property-based grouping.

---

## Product Questions Driving the Design

### Q1 — Is the funnel working?
- What % of users who start complete the quiz?
- Where do they drop off — after priorities, mid-quiz, on a specific topic?

### Q2 — Is the quiz the right length?
- How many topics do users select in the priority step?
- Of those, how many do they complete?
- Does drop-off rate increase as the quiz progresses? (topic index → drop-off)

### Q3 — How are priorities distributed?
- How many topics marked critical / very important / important / low?
- Which specific topics get the most "critical" marks?
- Are users over-marking critical? (If so, weight differentiation is meaningless — open decision: cap critical at 1–2?)

### Q4 — Is the content calibrated?
- Which topics generate the most free-text answers? → option coverage gaps
- Which follow-up aspects (`targetedAspect`) are being probed? Are some always ignored?
- Which topics finish with 0 follow-ups even in deep mode? → AI not engaging

### Q5 — Are personalization choices meaningful?
- Does `depth=deep` produce more follow-ups per topic than `depth=short`?
- Does `tone` affect completion rate or engagement?

### Q6 — Are results useful?
- Are results well-distributed or always concentrated on 1–2 parties?
- Do users who prioritize weak-discriminator topics (health, housing) get muddier scores?

### Q7 — Are there operational problems?
- API error rate, quota hits, follow-ups not generated in deep mode

---

## Tool Decision: Mixpanel (free tier)

### Evaluated options

| Tool | Why rejected / chosen |
|---|---|
| Vercel Analytics | No session-level joining, no funnel builder, no property grouping — can't answer Q1–Q5 |
| Langfuse | Already in use for AI-layer tracing, but Q1–Q3 happen before any AI call — invisible to it |
| Hotjar / Clarity / ContentSquare | Free tiers exhausting; session recording only, no structured behavioral data |
| PostHog | Engineering-team product focus; Mixpanel has better PM-oriented UX at low volume |
| **Mixpanel** | **Chosen**: user has prior PM experience with it; funnel builder, cohort analysis, property grouping; free at 50–200 sessions/month; EU-hosted |

### Key requirement: useful at low volume (50–200 sessions)
Mixpanel's funnel and segmentation views work at very low volume. No data-engineer required.

---

## Infrastructure

### Two Mixpanel projects
| Environment | Project ID | Token |
|---|---|---|
| Production | 4038344 | `8b24c8fa6ed726f0bbd9c3fedeeee157` |
| Preview | 4038347 | `1cb57a070740669c964b1cb72d91035e` |

Both projects are in the **EU region** — critical for the implementation (see below).

### Vercel env vars
- `NEXT_PUBLIC_MIXPANEL_TOKEN` set separately per environment (Production vs Preview) in Vercel dashboard.

---

## Implementation

### Core helper: `lib/mixpanel.ts`

Single-init pattern with lazy initialization. Key decisions:
- `persistence: "localStorage"` — survives page navigations within a session
- `ip: false` — privacy requirement for a political tool
- `track_pageview: false` — manual event control
- `api_host: "https://api-eu.mixpanel.com"` — **REQUIRED**: both projects are EU-hosted; events sent to the default US endpoint (`api.mixpanel.com`) return `1` (accepted) but are silently discarded
- `debug: process.env.NODE_ENV !== "production"` — console logs in local dev only

### Session identity (no user accounts)
`sessionId` (UUID generated on mount) is used as `distinct_id`. Called once via `mpIdentify(sessionId, superProps)` which also registers super properties (`tone`, `depth`) so they auto-attach to every subsequent event. No `reset()` needed — each page load is a fresh UUID.

### Stale closure fix in `advanceToNextTopic`
Topic analytics data (follow-up count, aspects probed) was computed inside a closure that could be stale by the time it was read. Solved by passing an explicit `completed?: TopicCompletedProps` parameter to each `advanceToNextTopic` call site, using local variables rather than state.

---

## Event Schema (17 events)

All events include `session_id`. Super properties `tone`, `depth`, and `variant` (the pair, e.g. `formal/short` — added Round 2 so any report, funnels included, can segment by one breakdown) auto-attach via `mp.register()`.

Round 2 additions are marked _(R2)_ — properties added 2026-07-10 exist only on events from that date forward.

### `quiz_session_init`
Fires on component mount. Establishes the session.
```
session_id, tone, depth
```
Answers: Q5 (personalization baseline)

### `priorities_submitted`
Fires when user confirms topic weights and enters the quiz.
```
session_id, tone, depth,
topic_count,
critical_count, very_important_count, important_count, low_count,
critical_topics, very_important_topics, important_topics, low_topics   (R2 — topic-id lists;
  breaking down by a list prop shows real topic names instead of A–I lettered metrics)
seconds_on_step   (R2 — time spent ranking)
{topic_id}_bucket  (one per topic, value 0–4)
```
Answers: Q2 (topics selected), Q3 (priority distribution)

### `question_answered` _(R2)_
Fires on every answered or skipped question — the question-grain progression event. A session's last `question_answered` tells you exactly where it stalled (opener vs. follow-up #N), which `topic_completed` alone can't.
```
session_id, topic_id, topic_index,
question_type (opener | follow_up), follow_up_index (1-based, follow-ups only),
answer_mode (choice | free_text | skip),
seconds_on_question   (excludes AI-generation wait)
switch_count          (R2 — selection changes before confirming: clicking a different
                       option, or moving from a selected option to free text.
                       With seconds_on_question this is the hesitation signal —
                       the behavioral replacement for session recordings)
```
Answers: Q1 (sub-topic drop-off attribution), Q4 (free-text and skip rates per question type, hesitation per question)

### `topic_completed`
Fires when user advances past a topic (including via skip).
```
session_id, topic_id, topic_index, total_topics,
follow_up_count, opener_was_free_text, aspects_probed (array),
opener_answered   (R2 — false = topic skipped entirely at the opener)
skipped_follow_up (R2 — true = a shown follow-up went unanswered)
seconds_on_topic  (R2)
```
**Data-quality note (R2 bug fix)**: before 2026-07-10, skipping a shown follow-up recorded `follow_up_count: 0, opener_was_free_text: false, aspects_probed: []` regardless of the real state — inflating the "(empty list) = AI not engaging" signal with user disengagement. Interpret pre-R2 Q4 metrics with that caveat.

Answers: Q2 (completion per topic index), Q4 (aspects probed, free-text rate, skip-vs-AI-not-engaging)

### `quiz_completed`
Fires when user submits and goes to results.
```
session_id, tone, depth,
topics_selected, topics_completed, topics_missed, has_close_text,
close_text_length      (R2)
free_text_opener_count (R2 — session-level free-text engagement)
```
Answers: Q1 (completion), Q5 (depth/tone vs completion)

### `quiz_abandoned`
Fires only on the rank-step back button (not beforeunload — that was never implemented and is unreliable anyway, especially mobile Safari). Mid-quiz abandonment is inferred from the last `question_answered` / `topic_completed` seen for a session (the standard "last event seen" pattern).
```
session_id, step, topics_completed_so_far
```
Answers: Q1 (drop-off by step)

### `results_viewed`
Fires on results page mount once scores are present.
```
session_id,
top_party, top_score,
second_party, second_score, score_spread_top2   (R2 — #1 vs #2 decisiveness),
third_party, third_score, score_spread_top3,
top3_parties       (R2 — list prop, readable breakdown)
topics_selected    (R2 — denormalized for report-level joins)
ai_scoring_used    (R2 — false = deterministic-only fallback; segment Q6 by this)
seconds_to_results (R2 — from quiz_completed click to results render, incl. scoring wait)
score_{party_id}  (one per party)
```
Answers: Q6 (score distribution, concentration, degraded-vs-full sessions)

### `results_ai_loaded` _(R2)_
Fires when the `/api/results` fetch resolves (results page shows scores before this).
```
session_id, blurb_shown, groundings_shown, seconds_to_load
```
Answers: Q6/Q7 (AI-layer delivery rate, perceived loading wait)

### `results_interaction` _(R2)_
Fires on results-page engagement — the behavioral "are results useful" signal.
```
session_id, action (pdf_export | methodology_opened | grounding_expanded |
                    back_to_quiz | go_home_clicked | go_home_confirmed),
party_id, party_rank   (grounding_expanded only; rank is 1-based)
```
Answers: Q6 (engagement; grounding_expanded tracks the "see details" discoverability fix)

### `navigated_back` _(R2)_
Fires on any backward navigation inside the quiz (question header back, close-step back). The rank-step back fires `quiz_abandoned` instead (leaves the quiz). User testing flagged navigation/progress confusion — this measures it.
```
session_id, from_step (questions | close),
from_question_type (opener | follow_up), topic_id, topic_index   (questions only)
```

### `hint_opened` _(R2)_
Fires when a TermHint explainer is expanded (quiz opener option hints, follow-up hints) — the terminology hints were a round-1 user-testing request; this measures whether they're used.
```
label   (the hint's button label, e.g. מה זה "טייקונים"?)
```

### `results_exit` _(R2)_
Fires on `pagehide` from the results page (tab close / refresh / external navigation), sent via `sendBeacon` to survive teardown. In-app exits are timestamped by their own events (`back_to_quiz`, `go_home_confirmed`) — together they give results-page dwell time.
```
session_id, seconds_on_results
```

### `about_viewed` _(R2)_
Fires on /about page mount (via `PageViewTracker`).
```
page
```

### `share_clicked` _(R2)_
Fires on any share button (results page and landing page).
```
placement (prominent | landing | subtle), method (native | clipboard), completed
```
Answers: Q6 (advocacy signal). No session_id — joins via distinct_id where identified.

### `feedback_opened` / `feedback_submitted` _(R2)_
Fires on the global feedback widget.
```
page  (pathname where the widget was used)
```

### `api_error`
Fires on API failures in `/api/results`, `/api/follow-up`, `/api/score-topics` _(R2 — was silently swallowed)_, `/api/export-pdf` _(R2)_.
```
session_id, endpoint, error_code (QUOTA_EXCEEDED | SERVER_ERROR | ...)
```
Answers: Q7 (operational problems)

---

## What's NOT in Mixpanel (and where to find it)

| Data | Where |
|---|---|
| Follow-up question content | Langfuse (AI-layer traces) |
| Free-text answer content | Langfuse |
| Per-call latency / token counts | Langfuse |
| Session recordings / heatmaps | Microsoft Clarity (masked; Hotjar + ContentSquare removed 2026-07) |

---

## Known Gotchas

1. **EU endpoint is mandatory** — `api_host: "https://api-eu.mixpanel.com"` in `mixpanel.init()`. The default US endpoint silently discards events for EU projects while returning `1` (success). Verified empirically.
2. **`NEXT_PUBLIC_*` vars are baked at build time** — changing them in Vercel requires a fresh build (not `vercel redeploy`).
3. **Session-replay trackers** — reduced to Microsoft Clarity only (2026-07); Hotjar + ContentSquare removed. Clarity records with all page text masked (`data-clarity-mask` on `<body>`) because quiz answers are political opinions (special-category data). Set the Clarity dashboard masking mode to "Strict" as a backstop.
4. **Simplified ID Merge** — verify this is enabled in both Mixpanel project Settings before significant data accumulates (one-way door).
