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

### "Since UTC midnight" windows silently exclude non-UTC daytime usage (#first:2026-07-03)

The `0 0 * * *` fix above (moving the cron to `0 6 * * *`) only fixed the *0-second* window case. It left a subtler version of the same bug: the query window was `[UTC midnight, now]`, so on a cron firing at 06:00 UTC that window is *always* exactly `00:00–06:00 UTC` — 6 fixed hours, not a rolling day. For a team in Israel (UTC+2/+3), that's 2–9 AM local: the one stretch when the app has no traffic. Verified against real Langfuse data across 4 consecutive days: full-day generation counts were 8/100/17/14, but the `00:00–06:00 UTC` slice was **0 every single day** — the report wasn't broken, it was accurately summarizing an always-empty window.

**Rule**: A once-daily cron reporting "usage since X" should query a **rolling window** (`now - 24h` to `now`), not "since the start of the UTC calendar day." The UTC-midnight boundary has no relationship to either the app's usage timezone or (usually) the upstream quota's own reset time — anchoring the query to it is almost always wrong for a non-UTC audience.

**How this was caught**: user reported the Slack message showed "0 requests" despite knowing Gemini had been called recently. Before touching code, queried Langfuse directly (via `langfuse-cli`) for the same time window the route computes, across several past days, to confirm the window itself — not a delivery/auth/credentials issue — was empty every time. Cheap way to distinguish "this specific run had no traffic" from "this window can structurally never have traffic."

### Async threshold alerts vs. cron (#first:2026-06-28)

Real-time threshold alerts (e.g., "80% of quota used") should be sent **by the app asynchronously** during actual API calls — not by a daily cron. Doing it in a daily cron means you only find out at 06:00 UTC regardless of when the threshold was crossed.

**Constraint**: Async alerting requires a KV store for de-duplication (otherwise every call after crossing 80% sends a Slack message). On Vercel Hobby without a KV store, async alerts would spam Slack. Decision: implement async alerts only when a KV store is available.

### Vercel CRON_SECRET — not auto-injected; must be set manually (#first:2026-06-28, corrected 2026-07-09)

**Correction to this entry's original claim.** It used to say "Vercel automatically injects a `CRON_SECRET` system env var" — **false**, and this false belief caused a real 2-day production outage (see the incident below). What's actually true: `CRON_SECRET` is an ordinary project env var *you* must create (any value, e.g. `openssl rand -hex 32`) in Vercel's dashboard/CLI. The only thing Vercel does automatically is *forward* whatever value is stored there as `Authorization: Bearer <value>` when it invokes the cron — scheduled runs, the dashboard "Run" button, and `vercel crons run <path>` all send it. If the var doesn't exist, Vercel has nothing to send, and `process.env.CRON_SECRET` is `undefined` in your function regardless of what any *other*, differently-named var contains.

**Incident (2026-07-09): this wrong belief silently broke the quota-check cron for ~2 days.** Timeline: 2026-06-28 rename commit (`eb9298a`) switched the code from a custom `QUOTA_CRON_SECRET` to `process.env.CRON_SECRET`, and — believing the false claim above — deleted `QUOTA_CRON_SECRET` from Vercel without ever adding `CRON_SECRET` in its place. At the time, the auth check was `if (cronSecret) { ...401 check... }` with no else-branch, so a missing secret just skipped the check entirely — the endpoint was quietly *unauthenticated* but still worked, so the daily Slack report kept arriving and nobody noticed. On 2026-07-07, an unrelated security review correctly closed that "fails open when unset" hole by adding a fail-closed 503 for any Vercel deployment missing `CRON_SECRET` — a good fix in isolation, but since the var still didn't exist, every invocation from that point on 503'd before ever reaching Langfuse/Slack. Nobody caught it until the user noticed the daily Slack message was missing, two days later. Diagnosis path: confirmed via `vercel crons ls`/`vercel crons run` (cron *was* correctly registered/enabled) and runtime logs (zero invocations at all before the fix — ruling out an app-level failure, since even a rejected request would have logged a status code) — the failure was invisible until a manual trigger surfaced the 503.

**Rule**: never trust a claim about platform "automatic" behavior in a past commit/changelog entry at face value, even your own — verify it against current official docs before relying on it, especially when it's used to justify deleting or renaming a credential. Vercel's own doc snippet for securing a cron route (`if (!cronSecret || authHeader !== ...)`) makes clear the value must already exist; there's no auto-provisioning path.

### Vercel env var changes require a redeploy to take effect (#first:2026-07-09)

Adding or changing a Vercel environment variable (via dashboard or `vercel env add`) does **not** update an already-running production deployment. Env vars are baked into a deployment at build time; the currently-live deployment keeps serving with whatever env vars existed when *it* was built.

**Symptom**: added `CRON_SECRET` via `vercel env add CRON_SECRET production`, then immediately re-triggered `/api/quota-check` via `vercel crons run` — still got the same 503 as before, because the request hit the deployment that existed before the var was added.

**Fix**: `vercel redeploy <deployment-url> --target=production` rebuilds the exact same already-pushed commit (no code changes) so functions pick up the current env var set. This is different from `vercel deploy` (which would push new/uncommitted local state) — safe to use as the standard way to make an env-var-only fix take effect without waiting for the next natural git push.

### Diagnosing cron jobs: `vercel crons ls` / `vercel crons run` (#first:2026-07-09)

The installed global `vercel` CLI in this environment (48.4.1) predates the `crons` subcommand — `vercel crons ls` silently mis-parses as `vercel deploy crons ls` ("Can't deploy more than one path"). Use `npx vercel@latest crons ls` / `npx vercel@latest crons run <path>` instead (beta command, works even though the global CLI is outdated).

- `vercel crons ls --format json` confirms whether a cron is actually registered/enabled on Vercel's side and which deployment it's currently pointed at — useful for ruling out a config/registration problem before suspecting the app code.
- `vercel crons run <path>` triggers a real cron invocation (correct auth header included) on demand — the fastest way to test whether a cron route actually works right now, without waiting for the schedule. Note it has real side effects if the route does something on success (e.g. posts to Slack) — treat it like any other production action, not a pure dry-run.
- Absence of any log lines for a cron's path (checked via runtime-log `requestPath`/`route` grouping) means the invocation never reached the function at all — distinct from, and diagnosed before, an application-level failure (which would still show a non-2xx status).

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

---

## Security Headers & CSP

### The `x-forwarded-for` rate-limit key is safe on Vercel — don't "fix" it (#first:2026-07-08)

`middleware.ts` derives the rate-limit key from `req.headers.get("x-forwarded-for")?.split(",")[0]`. The leftmost-value pattern is the classic *spoofable* one on a generic proxy — but on Vercel it's safe: Vercel **overwrites** `x-forwarded-for` with the real client IP and does not forward external values, unless an Enterprise "trusted proxy" is enabled (this project isn't). Confirmed via Vercel's request-headers docs.

**Rule**: on this deployment, leave it as-is — a security review flagging it as spoofable would be wrong here. It only becomes spoofable if the app is ever self-hosted behind a different proxy; at that point switch to `@vercel/functions`' `ipAddress()` helper.

### Enforced nonce CSP lives in middleware, is production-only, and forces dynamic rendering (#first:2026-07-08)

The enforced Content-Security-Policy (`buildCspHeader()` in `middleware.ts`) uses a per-request nonce + `'strict-dynamic'` so there's **no `'unsafe-inline'`** in `script-src`. Mechanics: the nonce is set on both the *request* headers (Next reads it from the request CSP header to stamp its own inline/hydration scripts) and the *response* headers (the browser enforces it). The one hand-written inline script (Clarity, `app/layout.tsx`) is nonced there via `(await headers()).get("x-nonce")`.

- **It's production-only** (`process.env.NODE_ENV === "production"` gate) — dev stays relaxed so HMR/eval/websockets aren't blocked. Verify it with `npm run build && npm start`, not `npm run dev`.
- **It forces dynamic rendering.** Reading the nonce in the *root* layout opts every route into dynamic rendering — `/`, `/about`, `/terms` went from `○ (Static)` to `ƒ (Dynamic)` in the build output. This is inherent to any nonce CSP in the App Router; there's no static-compatible path (Next's own inline scripts have no stable hash to allowlist).
- **To allow a new third-party script/pixel/embed**, add its origin to the right directive in `buildCspHeader()` (usually `connect-src` for beacons; script hosts are covered by `'strict-dynamic'` for browsers that support it). `/api/csp-report` logs violations to server logs (Vercel runtime logs) — the tripwire for anything silently blocked.
- Verified end-to-end on a preview browser session (2026-07-08): Clarity, Mixpanel (`api-eu.mixpanel.com` in `connect-src`), Vercel Analytics (same-origin), and all app routes work under the policy.
- **Vercel's own first-party packages (`@vercel/analytics`, `@vercel/speed-insights`) need zero CSP entries** — added Speed Insights 2026-07-09, confirmed no `buildCspHeader()` change needed. Both inject their script client-side (nothing in server-rendered HTML — check with `npm run build && npm start`, same as above) via same-origin `/_vercel/<product>/*` paths that Vercel's edge proxies internally, not a real third-party host. `'self'` covers the same-origin fetch/script, and `'strict-dynamic'` trusts the client-injected `<script>` tag transitively (it's inserted by Next's own already-nonced hydration script) — identical mechanism to Clarity's injected tag above, just first-party instead of third-party.

### Rate-limit coverage is a data table, not a comment (#first:2026-07-08)

Two Gemini/Slack routes (`/api/results`, `/api/feedback`) shipped uncapped because the rate-limit dispatch was a hand-maintained if/else chain whose comment said "the two AI-calling routes" while there were three. The matcher also had to broaden to all pages for the CSP nonce, so it can no longer serve as the coverage list.

**Rule**: rate-limit rules live in the exported `RATE_LIMIT_RULES` table (path → limiter → on-limit action), and `tests/middlewareRateLimit.test.ts` asserts every resource-spending route is in it. Any new route that spends a metered/external resource (Gemini quota, headless browser, Slack webhook) must be added there — the test, not a prose comment, is the guard.

### `RATE_LIMIT_RULES` (app-level) and Vercel Firewall (platform-level) solve different problems (#first:2026-07-09)

Prompted by a user question while fixing the quota-check incident above: "isn't there a DDoS risk on routes not in `RATE_LIMIT_RULES`?" The honest answer required distinguishing two layers that look similar but aren't:

- **`RATE_LIMIT_RULES` + Upstash** (`middleware.ts`) is a *cost-control* mechanism for specific routes that spend metered money per call (Gemini tokens, headless Chromium, Slack posts). It runs *inside* the request — every request, including ones that get rejected, still costs a full function invocation plus a Redis round-trip. It does nothing to stop a volumetric flood; it just caps sustained per-IP cost on the routes it lists.
- **Vercel's automatic DDoS mitigation** is a separate, always-on platform layer — enabled for every project on every plan (including Hobby) with zero configuration, covering L3/L4/L7 attacks, in front of *all* traffic before it reaches middleware or app code. Blocked traffic isn't billed. This already covers every route, including ones with no `RATE_LIMIT_RULES` entry (like `/api/quota-check`) — so "not in `RATE_LIMIT_RULES`" does not mean "unprotected from DDoS."
- **The real gap**: moderate-volume single-IP abuse that stays under the automatic-DDoS-mitigation threshold but above what's reasonable for one visitor. Adding a route to `RATE_LIMIT_RULES` wouldn't close this gap efficiently (still bills a function invocation per rejected request); the right tool is a **Vercel Firewall custom rule** with a `rate_limit` action, which enforces at Vercel's edge *before* the function runs — rejected requests aren't billed, and one rule covers every path instead of needing a per-route entry.

**What we added**: a blanket Firewall rule (all paths, 300 req/IP/60s, staged `log`-only first per the recommended rollout, then published) as a floor under the whole app — complementary to, not a replacement for, `RATE_LIMIT_RULES`. Managed via `vercel firewall rules add/list/diff/publish` (see `vercel:vercel-firewall` skill); mutating commands only stage a draft, the user publishes.

### Verify which server you're actually testing — Next silently moves ports (#first:2026-07-10)

Started `npm run dev` for an end-to-end verification run; port 3000 was already held by a stale dev server from an earlier session (running pre-change code), so Next silently fell back to **3001** — visible only in the server log ("Port 3000 is in use by an unknown process, using available port 3001 instead"). The verification script, pointed at :3000, produced a complete, internally-consistent, convincingly *wrong* result: every event fired, just with the old schema. Textbook stale-deployment trap, local edition (same failure shape as the 2026-07-03 RTL-debugging incident with a stale preview URL).

**Rule**: after starting any server for verification, read the startup log for the *actual* port/URL before pointing a client at it — and if results contradict code you just wrote, check *what* you're testing before doubting the code. Kill by port (`kill $(lsof -ti:3001)`), not by process name — `pkill -f "next dev"` would take down the user's other session too.
