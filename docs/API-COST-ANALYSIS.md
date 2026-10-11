# API Cost Analysis

_Last updated: 2026-10-12 (grounding-harvest section added; the baseline tables below are still the 2026-06-30 measurement)_

## Baseline measurement (1 user session)

| Metric | Value |
|--------|-------|
| Total tokens | 52,515 |
| API calls | 11 |
| Assumed input split | ~75% (~39,386 tokens) |
| Assumed output split | ~25% (~13,129 tokens) |

The score-topics call is the single biggest cost driver: ~21,151 tokens (40% of session total), almost entirely input (large party-platform context passed per call).

---

## 2026-10-12: effect of the full grounding harvest (branch `feature/grounding-recheck-2026-10-11`, not yet live)

The harvest took the grounding from 364 summary-style entries to 809 verbatim ones, so every prompt that carries party text grew. Figures marked "measured" come from `scripts/compare-scoring.ts` (real model calls, `usageMetadata.promptTokenCount`); the rest are estimates from character counts.

| Call | Live site (`main`) | Branch | Basis |
|------|-------------------|--------|-------|
| score-topics, whole topic (old behaviour) | 28,318 input tokens | 77,284 | measured, nine topics, two follow-ups each |
| score-topics, sub-topic filter (new behaviour) | — | 45,359 | measured, same heavy case; a typical session (one follow-up on most topics) is smaller, not measured |
| follow-up generator, party text summed over nine topics | ~56K characters | ~166K characters | estimate; sent once per follow-up question, so a session pays at least this once |

- **score-topics**: with the sub-topic filter the heavy case costs about 17K more input tokens per session than today. At the $0.25 per 1M input rate used below that is about $0.004 per session. The rate is the Gemini 2.0 Flash Lite figure; the route now runs `gemini-3.1-flash-lite` and its price has not been re-checked here.
- **follow-up generator**: not narrowed. Its party text roughly tripled; at about 0.45 tokens per character (the ratio measured on the scoring prompt) that is on the order of 50K extra input tokens per session, about $0.012 at the same rate — now the larger increase of the two, and it also adds latency to every follow-up question. Tracked in TODO 26(c).
- **Why the filter exists**: quality more than cost — the 77K-token prompt doubled run-to-run score noise (0.10 → 0.22 mean change on identical input). The filter brings it to 0.19.
- The session totals and scaling tables below have not been re-measured; treat them as a lower bound once this branch is live.

---

## Per-session cost by model

| Model | Input $/1M | Output $/1M | Cost/session |
|-------|-----------|------------|-------------|
| Gemini 2.0 Flash Lite | $0.25 | $1.50 | ~$0.030 |
| Claude Haiku 4.5 | $1.00 | $5.00 | ~$0.105 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | ~$0.31 |

Haiku is ~3.5× more expensive than Gemini Flash Lite; Sonnet is ~10×.

---

## Scaled daily cost

| Scale | Gemini Flash Lite | Claude Haiku 4.5 |
|-------|------------------|-----------------|
| 1 user/day | $0.030 | $0.105 |
| 100 users/day | $2.95 | $10.50 |
| 1,000 users/day | $29.50 | $105 |

### Monthly (×30 days)

| Scale | Gemini Flash Lite | Claude Haiku 4.5 |
|-------|------------------|-----------------|
| 100 users/day | ~$89/mo | ~$315/mo |
| 1,000 users/day | ~$885/mo | ~$3,150/mo |

---

## Notes

1. **Gemini pricing** confirmed from current docs — $0.25/$1.50 per 1M in/out for Gemini 2.0 Flash Lite.
2. **Cost driver**: score-topics is 40% of token spend. Reducing the party-platform excerpts passed per call (e.g. only sending relevant parties' excerpts, not all 13) would cut costs proportionally. _2026-10-12: done by sub-topic rather than by party — see the harvest section above._
6. **Stale baseline**: this measurement predates הציונות הדתית being added as an 11th party (2026-08-17) and מילואימניקים/עמך ישראל being added as a 12th/13th (2026-09-16). The score-topics/results prompts now carry meaningfully more party-platform context than this baseline — not re-measured, but small enough per-party that the trigger points below still hold.
3. **Batch pricing**: Gemini offers 50% off for batch processing. At 1,000 users/day you could run nightly scoring batches and cut costs to ~$440/mo.
4. **Power users**: assumes 1 complete flow = 1 user. Users who restart or re-run the quiz multiply costs.
5. **Tier**: paid Tier 1 since 2026-09-29 (enabled because free-tier traffic was deprioritized under load — 503s and 60s+ responses, see `docs/learnings/project/AI-INTEGRATION.md`). Limits for `gemini-3.1-flash-lite`: RPM 4K, TPM 4M, RPD 150K. Daily Slack summary via the quota-check cron. The volume table below predates this and assumed staying on free tier at low volume.

---

## Trigger points for action

| Daily users | Monthly cost (Gemini) | Recommended action |
|------------|----------------------|-------------------|
| < 100 | < $90/mo | Stay on free tier; monitor quota |
| ~200–300 | ~$180–270/mo | Switch to paid Gemini tier |
| ~1,000+ | ~$885/mo | Optimize score-topics prompt size; consider batch processing |
