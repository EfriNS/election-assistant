# Infrastructure Patterns (election-assistant)

**Purpose**: Vercel, cron, and operational infrastructure patterns discovered during development.

---

## Cron Jobs

### Vercel Hobby plan: daily crons only (#first:2026-06-28)

Vercel Hobby plan limits crons to **once per day** maximum. This affects the design of any polling/monitoring logic.

**Implication**: De-duplication patterns designed for sub-hourly crons (e.g., "compare current vs 1-hour-ago to detect newly-crossed thresholds") are wrong for a daily cron. A daily cron runs once — there is no "previous run today" to compare against.

**Rule**: For a daily cron that monitors a quota or metric:
- Always send the summary (don't gate it on "did the value change?")
- Use emoji/severity levels to indicate alerting state inline
- Don't try to de-dup across runs; there's only one run per day

### Gemini quota reset time (#first:2026-06-28)

Gemini API daily quota resets at **midnight Pacific Time** = **07:00 UTC** (PDT) / 08:00 UTC (PST).

Cron schedule for end-of-day quota summary: `0 6 * * *` (06:00 UTC — 1 hour before reset, captures full day's usage).

**Watch out**: A schedule of `0 0 * * *` (midnight UTC) fires when `todayStart === now`, making the Langfuse query window 0 seconds wide → 0 tokens → nothing to report. Always schedule quota checks well within the quota day.

### Async threshold alerts vs. cron (#first:2026-06-28)

Real-time threshold alerts (e.g., "80% of quota used") should be sent **by the app asynchronously** during actual API calls — not by a daily cron. Doing it in a daily cron means you only find out at 06:00 UTC regardless of when the threshold was crossed.

**Constraint**: Async alerting requires a KV store for de-duplication (otherwise every call after crossing 80% sends a Slack message). On Vercel Hobby without a KV store, async alerts would spam Slack. Decision: implement async alerts only when a KV store is available.

---

## Slack Webhooks

### Always-send vs. threshold-gated design (#first:2026-06-28)

Two valid webhook patterns:
1. **Always-send**: Every cron run sends a Slack message. Good for daily summaries. Easy to implement; no state needed.
2. **Threshold-gated**: Only send when a condition is newly met. Good for real-time alerts. Requires state (to detect "newly crossed").

For a **daily cron on Hobby plan**: use always-send. The single daily run is the natural summary moment.

For **real-time alerts**: threshold-gated with KV-backed de-dup (future work).
