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

### Shared notifySlack helper pattern (#first:2026-06-29)

All AI-calling routes share a single `lib/slack.ts` helper (`notifySlack(text)`). It reads `QUOTA_SLACK_WEBHOOK_URL`, fires the POST, and swallows all errors — Slack failures must never cascade into the route's error response.

**Rule**: Always `await notifySlack(...)` inside catch blocks (latency doesn't matter on the error path). Use `void notifySlack(...)` for non-blocking fire-and-forget within the success path (e.g., detecting a silent degradation after `parseScores` returns `{}`).

### Silent AI failure detection (#first:2026-06-29)

Some AI failures don't throw — they return a response where JSON extraction yields nothing (`parseScores` returns `{}`). These are invisible to Langfuse catch-block logging.

**Detection pattern**: After calling the AI and parsing, check if the result is empty despite a non-empty response:
```typescript
if (Object.keys(scores).length === 0 && text.length > 0) {
  void notifySlack(`⚠️ /api/score-topics — parse failure: AI returned no valid JSON\n${text.slice(0, 300)}`);
}
```

**Rule**: Whenever an AI call has a silent degradation path (returns a default/empty value instead of throwing), add explicit detection + Slack notification so the failure isn't invisible.

---

## Vercel Environment Variables & Langfuse Debugging

### `vercel env pull`/`ls` cannot verify "Sensitive" env var values (#first:2026-07-02)

Vercel env vars marked "Sensitive" (shown as "Encrypted" in `vercel env ls`, same as regular secrets) are **write-only from the CLI** — `vercel env pull` writes an empty placeholder (`VAR=""`) for them instead of the real value, even though the actual deployed function receives the real value at runtime. This is a deliberate security feature, not a bug.

**Failure mode**: comparing `LANGFUSE_SECRET_KEY` between local `.env.local` and a `vercel env pull` output to check whether local/prod point to the same account will always show local as non-empty and prod as empty — this looks like a real credential mismatch but proves nothing, since prod's pulled value is unconditionally empty regardless of what's actually configured.

**Rule**: don't use `env pull`/`ls` to verify sensitive-credential parity across environments. If you need to confirm two environments hit the same backend, compare *observable behavior* (e.g., query the same third-party service and see if the same data shows up) rather than the credential values themselves.

### Don't compare .env values via `grep | cut` — quoting produces false mismatches (#first:2026-07-02)

`.env` files may quote values (`LANGFUSE_BASE_URL="https://cloud.langfuse.com"`). Extracting the value with `grep "^VAR=" file | cut -d= -f2-` returns the value **including the literal quote characters**. Comparing that against an unquoted literal (`[ "$val" = "https://cloud.langfuse.com" ]`) will report a false mismatch, because `"https://cloud.langfuse.com"` (10 extra chars) ≠ `https://cloud.langfuse.com`.

**What actually happened**: this exact mistake led to incorrectly telling the user that local dev and Vercel Preview/Production pointed to different Langfuse hosts. They didn't — both resolved to the same default (`https://cloud.langfuse.com`). Correction required admitting the error and re-verifying properly.

**Rule**: to check an `.env` value programmatically, either (a) `source`/`.` the file in bash (which correctly strips quotes during variable assignment) and compare the resulting shell variable, or (b) parse it properly (e.g., Python's simple `line.split('=', 1)[1]` still needs quote-stripping — safest is a real dotenv parser). Never trust raw `grep`/`cut` output for equality comparisons against literals.

### Langfuse Cloud has a short ingestion-to-queryable indexing lag (#first:2026-07-02)

A `langfuse-cli api observations list` query run within roughly 1-2 minutes of an event occurring can return zero results even though the write is durable — the SDK's `await langfuse.flushAsync()` (called before the app's Slack notification fires) guarantees the event was *received*, but there's a separate delay before it becomes visible to the list/filter query endpoint.

**Symptom**: querying a narrow time window immediately after being told "an error just happened" comes up empty; re-querying the same window a couple of minutes later finds the exact same events. This looks like "wrong project/host" but is actually just timing.

**Rule**: if a Langfuse query for a very recent event (within the last 1-2 minutes) comes up empty, don't conclude the wrong host/project — wait a short interval and retry with the same query before investigating credentials/config.

### Manual `vercel deploy` is blocked by auto-mode when contradicting a stored preference (#first:2026-07-02)

When the user has a stored memory/feedback note like "never run `vercel deploy` manually — GitHub push triggers auto-deploy," the harness's auto-mode safety classifier will actively block a `vercel deploy` Bash call that contradicts it, even mid-session, even when the current request seems to justify an exception (e.g., "deploy a preview environment"). This is the memory system working as intended — surface the conflict to the user via `AskUserQuestion` rather than either silently complying or silently refusing; let them explicitly override if they want to.

---

## Testing

### ?notrack=1 for analytics-clean testing (#first:2026-06-29)

Add `?notrack=1` to the production URL to suppress Mixpanel initialization entirely (`getMixpanel()` returns null). Allows manual test runs through the full quiz flow on production without polluting analytics data.

**Pattern**: Check `new URLSearchParams(window.location.search).get("notrack") === "1"` at the top of the analytics initializer. No cookie, no localStorage — purely URL-based so it's easy to share and revoke.

**Alternative considered**: Preview branch with `NEXT_PUBLIC_MIXPANEL_TOKEN` cleared in Vercel env vars. Rejected: Vercel project wasn't configured to deploy non-main branches, and the URL param approach is simpler.

---

## Data Flow

### PDF export inherits /api/results filtering automatically (#first:2026-06-29)

The PDF export button passes the `groundings` state variable directly to `/api/export-pdf`. That state is populated from the `/api/results` response. Any filtering applied in `buildGroundingsForParties` (e.g., `coveredAspects` filtering) flows through to the PDF with zero extra code.

**Rule**: When modifying what groundings are returned from `/api/results`, the PDF is automatically updated. Only if a future data path bypasses `/api/results` (e.g., a direct PDF-only fetch) would a separate PDF change be needed.
