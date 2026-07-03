---
description: "Manually verify the quiz/results user flow in a browser (no automated E2E suite exists in this repo)"
---

There is no automated E2E test suite in this repo (no Playwright, no `test:e2e` script) — verify user-facing flows manually.

## Quick Check (Recommended)

1. Start the dev server: `npm run dev`
2. Drive the quiz flow with browser tooling (Playwright MCP or equivalent), covering:
   - An opener answer for at least one topic, through to its AI-generated follow-up question
   - Completing enough topics to reach the results page
   - The results page's grounding accordion — check that matched quotes are highlighted for multiple parties, not just 1-2
3. Watch the browser console and network tab for errors during the flow (Gemini call failures, JSON parse errors, rate-limit responses)

## What to look for

- **Follow-up questions read as progression, not repetition** of the opener question (a recurring regression class — see `docs/learnings/project/VAA-DESIGN.md` items 66-70)
- **Results grounding quotes**: multiple parties should show highlighted "matched" quotes, not just the top 1-2 — if only 1-2 show up, that's usually a taxonomy/aspect-matching regression, not a data gap
- **No visible JSON parse / quota errors** in the console during a normal run

## If something breaks

- Check the relevant API route's Langfuse trace for the exact Gemini output that failed
- Common root causes: unescaped Hebrew gershayim in a Gemini JSON string (fixed via `responseJsonSchema` — see CHANGELOG 2026-07-02), a grounding entry missing a required field (`provenance`/`concreteness`/`aspect`), or an expired/rate-limited Gemini key

## Note

If a real Playwright suite is ever added, replace this command with the real E2E workflow — this describes the manual substitute until then.
