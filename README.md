# עוזר הבחירות — Election Assistant

A free, transparent tool that helps you find which Israeli political party best matches your values — with exact quotes from official party platforms as evidence.

**Live**: [voteassist.me](https://voteassist.me)

---

## How It Works

1. **Set priorities** — rank which policy topics matter most to you (security, economy, housing, education, health, religion, justice, equality, ecology)
2. **Answer questions** — structured questions per topic, with optional AI follow-ups that dig deeper based on your answers
3. **See results** — parties ranked by match score, with verbatim platform quotes explaining why each party scored the way it did

Match scores blend two signals:
- **Deterministic**: each answer option has per-party scores (-2 to +2) derived from official platform texts
- **AI-scored**: free-text and follow-up answers are scored by Gemini Flash Lite against verbatim platform passages

Final score = weighted average across your prioritised topics, normalised to 0–100%.

## Parties Covered (June 2026)

חד"ש-תע"ל · רע"מ · הדמוקרטים · ביחד (בנט/לפיד) · ישר! (איזנקוט) · ישראל ביתנו · ליכוד · ש"ס · יהדות התורה · עוצמה יהודית

Parties without a published current platform are shown with an explicit outdatedness warning and the source used (e.g. coalition principles, older manifesto).

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **AI**: Google Gemini Flash Lite (`gemini-3.1-flash-lite`) — follow-up questions, scoring, results analysis
- **Observability**: Langfuse (optional) — token tracking, no user content logged
- **Rate limiting**: Upstash Redis (optional) — 100 sessions/IP/day in production
- **Analytics**: Vercel Analytics + Mixpanel (product/funnel analytics) + Microsoft Clarity (session replay/heatmaps, all page text masked) — anonymized; see [`/terms`](https://voteassist.me/terms)
- **Hosting**: Vercel

## Running Locally

```bash
# 1. Clone and install
git clone https://github.com/EfriNS/election-assistant.git
cd election-assistant
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local — at minimum set GEMINI_API_KEY

# 3. Start dev server
npm run dev
# → http://localhost:3000
```

The app runs fully without Langfuse or Upstash credentials — those are production-only integrations.

## Environment Variables

See [`.env.example`](.env.example) for the full list with descriptions. The only required variable for local development is `GEMINI_API_KEY`.

## Tests

```bash
npm test          # run all tests (Vitest)
npm run lint      # ESLint
npm run build     # Next.js production build
```

## Platform Data

Party platform quotes are stored in `data/groundings/<partyId>.json`. Each entry includes:
- verbatim text
- topic and aspect
- source URL
- retrieval date
- optional `contrary` flag (party explicitly opposes this position)

To update or add entries, edit the relevant JSON file. The `scripts/auto-score.ts` script derives answer-option scores from this data using Claude.

## Principles

- **Transparent** — results cite exact quotes from official party platforms with source URLs
- **Non-partisan** — all parties treated equally; missing platforms disclosed explicitly
- **No identity, no raw answers stored** — quiz responses, including free-text answers, are never logged or linked to your identity. Anonymized analytics (topic priorities, completion funnel, matched party) are collected to improve the tool — see [`/terms`](https://voteassist.me/terms) for the full breakdown
- **Open** — source code is auditable

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md) for how to report it.

## License

MIT — see [LICENSE](LICENSE).
