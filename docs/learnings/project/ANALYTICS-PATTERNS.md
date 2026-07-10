# Analytics Patterns (election-assistant)

**Purpose**: Project-specific patterns for working with this project's Mixpanel integration — both the event schema (see `docs/ANALYTICS-DESIGN.md`) and the tooling used to manage dashboards/reports (see `docs/MIXPANEL-DASHBOARDS.md`).

---

## Mixpanel MCP Server

### Connecting mid-session doesn't make tools available immediately (#first:2026-07-01)

Running `claude mcp add` and `claude mcp login` successfully connects the server, but the *current* conversation's tool list was already built at session start — new MCP tools don't appear until Claude Code is restarted. `ToolSearch` won't find them either; this isn't a search problem, the tools genuinely aren't registered yet.

### OAuth login needs a real TTY (#first:2026-07-01)

`claude mcp login <server>` fails with "stdin isn't a terminal" both via the harness's own Bash tool and via the `!`-prefixed in-chat command mechanism — neither provides a genuine PTY. It only works run directly in a separate, real terminal window outside Claude Code entirely.

### `Update-Dashboard`'s error/success signal is unreliable (#first:2026-07-01)

Many calls that returned `"Unexpected error in Update-Dashboard"` had actually applied the mutation server-side; conversely, some calls with no visible error made no change at all. One error message in particular — `"Row 'X' not found in dashboard layout"` — showed up consistently on successful *delete* operations (the tool seems to try to re-confirm the deleted row's existence for the response and fails, misreporting success as an error).

**Rule**: after every `Update-Dashboard`/`Create-Dashboard` call, re-fetch with `Get-Dashboard(include_layout=true)` and compare actual layout against intent. Never trust the call's own response, in either direction. Also don't batch many new rows in one call — a 19-row batch add partially applied (6 of 19) then silently stopped; add one row at a time.

### `Bulk-Edit-Events` / `Bulk-Edit-Properties` are broken; use the singular tools (#first:2026-07-01)

Both bulk tools failed 100% of the time (including on batches as small as 10 items) with the same generic `"Unexpected error"`. `Edit-Event` and `Edit-Property` (one call per item) worked reliably every time. For ~50 properties, that's ~50 calls — fire them in parallel, it's still faster than debugging the bulk path.

### `query_id` from `Run-Query` should be attached immediately (#first:2026-07-01)

Letting time pass (minutes, not seconds) between generating a query and attaching it via `Update-Dashboard` risks the reference going stale or — worse — the attach silently pulling in unrelated pre-existing report content instead of erroring. Run `Run-Query` and the corresponding `Update-Dashboard` call back-to-back.

### Free tier hard-caps saved reports at 5 — not a rate limit (#first:2026-07-01)

Confirmed via web search and by hitting the wall at exactly the 5th successful report addition; waiting (even 25+ minutes) didn't help because it isn't time-based. Growth plan removes the cap; at this project's volume (50–200 sessions/month, well under the 1M free events/month) the upgrade is usage-based and effectively free. Don't confuse this with Mixpanel's separate "60/hour" or "600/hour" API *request* rate limits mentioned in Mixpanel's own docs for other integrations — this project's failures happened after ~15–20 total calls, far below either threshold, which is itself a clue the block is a resource cap, not a rate limit.

### EU region matters everywhere, not just event ingestion (#first:2026-07-01)

`ANALYTICS-DESIGN.md` already documents that `api_host` must be `api-eu.mixpanel.com` for event tracking. The same applies to the MCP server itself — use `https://mcp-eu.mixpanel.com/mcp`, not the default US endpoint, for both projects (Production 4038344, Preview 4038347).

---

## Event Schema Gotchas

### `aspects_probed` ≡ `TOPIC_KEY_DIMENSIONS` (#first:2026-07-01)

The `aspects_probed` array property on `topic_completed` is populated from `coveredAspects`, which accumulates each follow-up's AI-chosen `targetedAspect` (`app/quiz/page.tsx`), guided by `TOPIC_KEY_DIMENSIONS[topicId]` (`lib/questions.ts`). An empty array means zero follow-up aspects were covered for that topic completion — either no follow-up fired, or the topic had no grounding data for the AI to target. This is the concrete signal behind `ANALYTICS-DESIGN.md`'s Q4 "AI not engaging" question.

### Mixpanel Lexicon only registers events/properties that have actually fired (#first:2026-07-01)

Can't set a display name on `api_error` via `Edit-Event` until it occurs at least once in the project — Mixpanel returns `"Events not found"`. Same applies to any newly-added tracking property (e.g. `topics_missed`, added 2026-07-01) — it won't appear in `List-Properties` or be usable as a report breakdown until real data with that property exists.

### Optional analytics-payload params with `??` defaults silently corrupt data (#first:2026-07-10)

The follow-up-skip bug: `advanceToNextTopic(prologue, completed?)` defaulted every metric (`completed?.followUpCount ?? 0`, etc.), so the two skip buttons — which passed no payload — recorded every skipped topic as "0 follow-ups, no free text, no aspects," conflating *user disengagement* with the Q4 "AI not engaging" signal for a week of production data.

**Rule**: analytics payloads at call sites with divergent context should be a *required* param — let the type system force every new call site to state what happened explicitly. A `?? default` on a tracking payload is the workaround-shaped hole: it compiles, fires, and produces plausible-looking wrong data that no error will ever surface. (Same class: interpret pre-2026-07-10 `topic_completed` Q4 metrics with this caveat; `skipped_follow_up`/`opener_answered` exist only after.)
