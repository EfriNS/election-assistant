# Project Learnings Index

Thin map of this repo's institutional memory. Read this at session start; read a topic file only when your work touches its area.

## How learnings are organized

- **Universal engineering disciplines** live in the `dev-workflow` plugin as lazy-loaded skills (single source of truth in the `claude-code-template` repo — edit there, not here): `coding-principles` (invoke before error handling, parsing, fallbacks, or extracting utilities), `debugging-discipline` (bugs, destructive ops, before declaring success), `testing-discipline`, `collaboration-process`, `ai-prompt-engineering`, `competitive-research`, `second-opinion`.
- **Project-specific patterns** live below in `project/` — incidents, quirks, and decisions specific to this codebase, with file/line references.

## Project topic files

### [VAA-DESIGN](project/VAA-DESIGN.md) — the primary, most actively maintained file
Voting-advice-application domain design: grounding quality model (provenance × concreteness), question/dimension taxonomy, scoring decisions, party-data sourcing rules, neutrality/representativeness pitfalls (e.g. item 79: a "close parties" relevance filter must not gate what's possible to surface), legal/privacy items. Read when touching grounding data, questions, scoring, party metadata, or user-facing framing.

### [AI-INTEGRATION](project/AI-INTEGRATION.md)
Gemini structured-output patterns (`responseJsonSchema` mandatory — prompt instructions alone fail on Hebrew gershayim), retry-once policy for confirmed upstream glitches, token budgets for Hebrew output, Langfuse tracing conventions. Read when touching `/api/follow-up`, `/api/score-topics`, `/api/results`, or prompts.

### [NEXTJS-REACT-PATTERNS](project/NEXTJS-REACT-PATTERNS.md)
React/Next.js/Vitest specifics: `vi.mock` + `importOriginal` for modules whose own helpers are called internally, Hebrew/RTL interpolation rules, client-component testability. Read when writing components or tests.

### [INFRA-PATTERNS](project/INFRA-PATTERNS.md)
Vercel deploy behavior (deployment-pinned preview URLs vs branch aliases, env vars require a redeploy to take effect), Upstash rate limiting (data-driven `RATE_LIMIT_RULES`) vs. Vercel Firewall (platform-level DDoS mitigation + blanket per-IP rate limiting), the enforced nonce CSP + security headers (prod-only, forces dynamic rendering), `x-forwarded-for` anti-spoof on Vercel, cron/env-var wiring (CRON_SECRET is not auto-injected — real 2026-07-09 incident), quota monitoring. Read when touching middleware, env vars, CSP/headers, cron, or deployment.

### [ANALYTICS-PATTERNS](project/ANALYTICS-PATTERNS.md)
Mixpanel event schema gotchas (`aspects_probed` ↔ `TOPIC_KEY_DIMENSIONS`, Lexicon timing) and Mixpanel MCP quirks (unreliable success/error signals — re-fetch state after mutations, free-tier report cap). Read when touching analytics or querying Mixpanel.

## Maintenance rules

- `/wrapup` routes each insight: project-specific → the matching `project/` file (freely, but distilled — principle + one concrete example, not narrative); universal → propose an edit to the plugin skill in the `claude-code-template` checkout (conservatively).
- Keep this INDEX a thin map — **no session logs** (history belongs in CHANGELOG.md), no restated principles.
- Split a topic file when it stops being skimmable; delete items that turn out wrong.
