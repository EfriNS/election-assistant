# Mixpanel Config Backup (metadata, not event data)

Repo-side backup of the Production board ("Election Assistant — Core Analytics", id `11325742`, project `4038344`) so the dashboard can be **rebuilt** after corruption or accidental deletion. This exists because the board's layout was corrupted twice on 2026-07-10 (MCP row-adds), and recovery depended on a layout copy happening to be available.

## Hard limits — read before trusting this

- **Mixpanel cannot export query definitions.** `Get-Report` returns metadata only (name, type, timestamps), and boards have no public export/import API. The queries in `report-queries.json` are OUR authored copies — Mixpanel is not the source of truth for them, this file is. If someone edits a report's query in the Mixpanel UI, this backup silently drifts; note UI edits here when they happen.
- **This is rebuild material, not a restore button.** Restoration = re-running each query (`Run-Query`) and re-attaching (`Update-Dashboard` cell update), or hand-rebuilding in the UI from the JSON. Follow the gotchas in `docs/learnings/project/ANALYTICS-PATTERNS.md` (verify every mutation via bookmark `modified`; avoid MCP row-adds — they corrupt the board's API read path).
- **UI-only display settings are not capturable**: segment sort order (e.g. the 1→9 ascending sort on "Topics selected per session"), "% of overall" badge toggles, card sizes. They live only in Mixpanel.

## Files

- `board-core-analytics.layout.json` — row/cell structure with report ids, names, descriptions. Refresh with `Get-Dashboard(include_layout=true)` whenever the board is readable.
- `report-queries.json` — exact `Run-Query` payloads keyed by bookmark id, for every report authored/rebuilt in the 2026-07 rounds. Reports created 2026-07-01 whose exact JSON was never captured are marked `"query": "see prose spec"` — their semantics are in `docs/MIXPANEL-DASHBOARDS.md` § Report Spec.

## Maintenance habit

After any session that mutates the board or a report query: update `report-queries.json` with the new payload and refresh the layout snapshot. This is a session task (the MCP needs OAuth) — it cannot run in CI.
