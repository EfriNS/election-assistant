# Analytics Design — Election Assistant

_Decided: 2026-06-28. Implemented in `feature/mixpanel-analytics`._

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

## Event Schema (8 events)

All events include `session_id`. Super properties `tone` and `depth` auto-attach via `mp.register()`.

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
{topic_id}_bucket  (one per topic, value 0–4)
```
Answers: Q2 (topics selected), Q3 (priority distribution)

### `topic_completed`
Fires when user advances past a topic.
```
session_id, topic_id, topic_index, total_topics,
follow_up_count, opener_was_free_text, aspects_probed (array)
```
Answers: Q2 (completion per topic index), Q4 (aspects probed, free-text rate)

### `quiz_completed`
Fires when user submits and goes to results.
```
session_id, tone, depth,
topics_selected, topics_completed, has_close_text
```
Answers: Q1 (completion), Q5 (depth/tone vs completion)

### `quiz_abandoned`
Fires on beforeunload / back navigation.
```
session_id, step, topics_completed_so_far
```
Answers: Q1 (drop-off by step)

### `results_viewed`
Fires on results page mount once scores are present.
```
session_id,
top_party, top_score,
second_party, second_score,
third_party, third_score, score_spread_top3,
score_{party_id}  (one per party)
```
Answers: Q6 (score distribution, concentration)

### `api_error`
Fires on API failures in `/api/results`, `/api/follow-up`, `/api/score-topics`.
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
