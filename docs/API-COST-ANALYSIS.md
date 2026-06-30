# API Cost Analysis

_Last updated: 2026-06-30_

## Baseline measurement (1 user session)

| Metric | Value |
|--------|-------|
| Total tokens | 52,515 |
| API calls | 11 |
| Assumed input split | ~75% (~39,386 tokens) |
| Assumed output split | ~25% (~13,129 tokens) |

The score-topics call is the single biggest cost driver: ~21,151 tokens (40% of session total), almost entirely input (large party-platform context passed per call).

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
2. **Cost driver**: score-topics is 40% of token spend. Reducing the party-platform excerpts passed per call (e.g. only sending relevant parties' excerpts, not all 10) would cut costs proportionally.
3. **Batch pricing**: Gemini offers 50% off for batch processing. At 1,000 users/day you could run nightly scoring batches and cut costs to ~$440/mo.
4. **Power users**: assumes 1 complete flow = 1 user. Users who restart or re-run the quiz multiply costs.
5. **Free tier**: currently using Gemini free tier (rate-limited). Quota monitoring cron + Slack alerts at 50/80/90% in place.

---

## Trigger points for action

| Daily users | Monthly cost (Gemini) | Recommended action |
|------------|----------------------|-------------------|
| < 100 | < $90/mo | Stay on free tier; monitor quota |
| ~200–300 | ~$180–270/mo | Switch to paid Gemini tier |
| ~1,000+ | ~$885/mo | Optimize score-topics prompt size; consider batch processing |
