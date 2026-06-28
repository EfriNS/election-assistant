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

### Vercel CRON_SECRET — not QUOTA_CRON_SECRET (#first:2026-06-28)

Vercel automatically injects a `CRON_SECRET` system env var and sends it as `Authorization: Bearer <CRON_SECRET>` on every cron invocation (both scheduled and the dashboard "Run" button). Do NOT create a custom secret var for cron auth — use `process.env.CRON_SECRET`.

**Failure mode**: Custom secret mismatch → every invocation returns 401 → Vercel omits non-2xx runs from the cron log → appears as "0 log lines" with no indication the cron ever fired.

### Vercel `framework` key in vercel.json (#first:2026-06-28)

`framework: "nextjs"` in `vercel.json` IS required (despite not being documented as a standard key). Removing it causes Vercel to fall back to static-site mode → "No Output Directory named 'public'" build error.

### `memory` and `maxDuration` ignored on Fluid Compute (#first:2026-06-28)

Vercel warns at build time: "Provided `memory` setting in `vercel.json` is ignored on Active CPU billing." Both `memory` and `maxDuration` in the `functions` block are no-ops on Fluid Compute. The default `maxDuration` is 300s — don't set it lower thinking you're capping cost.

---

## PDF Generation (@sparticuz/chromium)

### break-inside-avoid on large elements forces page-per-element (#first:2026-06-28)

`break-inside-avoid` on an element that's taller than one page (e.g., a party card with full grounding quotes) doesn't compress it — it forces a page break before the element, leaving a large blank gap. Each card then gets its own page.

**Rule**: Apply `break-inside-avoid` only to the compact "header" portion of a card (name, score, chips, short description). Let tall content sections (grounding quotes, long text) flow naturally across pages. Use per-section `break-inside-avoid` within the long content to keep logical sub-units (e.g., topic label + its quotes) together.

### @sparticuz/chromium doesn't reliably render CDN-loaded fonts (#first:2026-06-28)

Minimal Chromium + Tailwind CDN Play + external font CDNs creates a race: PDF is captured before the font loads. Unicode symbols like ✓ (U+2713) and ✕ (U+2715) in Noto Sans may not be loaded in time and render as rectangles.

**Rule**: For symbols in PDF templates, use ASCII equivalents (v/x, +/-) rather than Unicode or emoji. Emoji (🚨, ✅, etc.) should also be avoided; use text labels instead.

---

## Slack Webhooks

### Always-send vs. threshold-gated design (#first:2026-06-28)

Two valid webhook patterns:
1. **Always-send**: Every cron run sends a Slack message. Good for daily summaries. Easy to implement; no state needed.
2. **Threshold-gated**: Only send when a condition is newly met. Good for real-time alerts. Requires state (to detect "newly crossed").

For a **daily cron on Hobby plan**: use always-send. The single daily run is the natural summary moment.

For **real-time alerts**: threshold-gated with KV-backed de-dup (future work).
