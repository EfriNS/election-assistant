# Election Assistant — Phased Roadmap

**Document status:** Living planning document — update as key decisions are resolved.
**Audience:** Builder, advisors, potential collaborators.
**As of:** June 2026. Elections approximately 6 months away.

---

## 1. Prototype Decision: E is the Winner

### What Was Tested

Four interaction models (A–D) were tested across three rounds of user testing with two representative users (age ~55 and age ~17) on Android and iPhone respectively. A fifth model (E) was built and tested in Round 3 as the synthesized front-runner.

| Model | Description | User Reception |
|---|---|---|
| A — הצהרות | 25–30 binary statements | Liked but clinical/impersonal |
| B — עדיפויות | Priority sliders then questions | Strong: empowering, personalized |
| C — דילמות | Concrete trade-off scenarios | Weakest; scenario neutrality is hard |
| D — שיחה | AI conversation chat | Split: User 1 engaged; User 2 (teenager) bounced |
| E — היברידי | Priorities → structured questions + AI follow-ups | Both users satisfied in Round 3 |

### Decision: Prototype E is the MVP Interaction Model

Prototype E — a teal-branded hybrid — combines everything that worked:
- Priority-first: users declare topic importance before answering questions (from B)
- Structured tappable-card questions, not chat bubbles (addresses User 2's bounce from D)
- AI-generated follow-up questions per topic (from D), giving depth without commitment to full freeform chat
- Tone (ענייני/אישי) and depth (ממוקד/מעמיק) set by user on the landing page
- UnifiedResultsPage shared across all paths: deterministic scores + AI profile summary + party blurbs

**Prototype D (AI conversation) remains accessible** as a secondary option ("מעדיפ/ה שיחה חופשית עם AI?") but is not the primary flow. Its status in MVP is an open question addressed in Section 5.

### What E Means for the MVP Codebase

The prototype codebase is already structurally correct:
- `app/prototype-e/page.tsx` — the complete E flow (priorities → questions → close → results), fully functional
- `components/PrioritiesStep.tsx` — shared priorities UI (teal accent), used by E and D
- `lib/questions.ts` — two complete question sets (QUESTIONS_FORMAL, QUESTIONS_PERSONAL) across 8 topics with calibrated party scores
- `lib/parties.ts` — all 7 parties with metadata and platform URLs where available
- `app/api/follow-up/route.ts` — AI follow-up generation with Langfuse tracing
- `app/api/results/route.ts` — AI profile + party blurb generation
- `components/UnifiedResultsPage.tsx` — shared results UI

The MVP build is largely a **hardening and data-grounding exercise** on top of this existing prototype, not a rewrite.

---

## 2. MVP Scope

### Hard In (MVP)

- Prototype E interaction path as the primary flow
- All 7 parties: חד"ש-תע"ל, הדמוקרטים, ביחד, ישר!, ישראל ביתנו, ליכוד, ש"ס
- Hebrew UI, RTL, full mobile support
- Two question registers (ענייני, אישי) × 8 topics = 16 validated question-answer sets
- Verbatim quotations from official party platforms shown in results, with source URL and date
- Explicit disclosure when a party has no published platform ("המפלגה לא פרסמה מצע רשמי")
- Deterministic scoring (the current weighted matrix approach)
- AI explanation layer: profile summary + per-party micro-blurbs (top 3 parties), grounded in cited platform data
- Graceful Gemini quota degradation: results still show without AI blurbs if quota is hit
- Rate limiting / per-session call caps to keep costs within the $50/month ceiling
- Methodology disclosure on results page (updated to reflect real data sourcing)
- Production domain (.co.il or .org.il — TBD)
- Public GitHub repository with transparent methodology

### Hard Out (MVP)

- Russian, Arabic, English UI — deferred to v1 (Phase 2)
- Prototype D (AI conversation) — accessible but not featured; no additional investment for MVP
- Coalition modeling — extensions (Phase 3+)
- Candidate records (experience, voting history) — extensions (Phase 3+)
- Admin/curation UI — v1
- Automated platform ingestion pipeline — v1 (manual data entry for MVP)
- Tradeoff questions — v1
- AI-scored follow-up answers feeding the deterministic score — v1
- User accounts, saved results, shareable profiles — v1
- Analytics dashboard — v1

---

## 3. Phases

### Phase 0: Pre-Launch Prerequisites (Weeks 1–6)

**Entry condition:** Prototype E validated ✅ (Round 3, June 2026).
**Exit condition:** All items below checked off; advisor sign-off; no public traffic yet.

This phase is entirely off-public. Nothing ships until Phase 0 is complete.

#### 0.1 Party position score validation (domain expert review)
All 7 parties' scoring arrays in `lib/questions.ts` are currently manual estimates. ביחד (בנט/לפיד) and ישר! (איזנקוט) are new parties — scores are particularly uncertain.
- Work: advisor reviews all 16 question sets (8 topics × 2 registers) and signs off on party score vectors
- **Advisor review format:** `docs/advisor-review/questions-review.md` — auto-generated via `npm run export:questions`. Shows each topic in both registers as markdown tables with party names as columns and an "Advisor Notes" column. Advisor annotates inline; developer applies corrections to `lib/questions.ts` manually.
- Each question set should carry a review date annotation after sign-off
- Output: `lib/questions.ts` scores annotated with expert review date; `lib/parties.ts` updated with real platform URLs

#### 0.2 Official party platform data collection + source archiving
For each party with a published platform: download, convert to markdown, extract verbatim quotes relevant to each topic, record source URL + date.
- Parties with known platform resources: הדמוקרטים (constitution PDF), ישר! (missions page, not a formal platform)
- Parties currently without: ביחד, ש"ס, ליכוד, ביתנו, חד"ש — monitor weekly; ingest as they publish
- **Source archiving:** Store copies in `docs/sources/<partyId>/YYYY-MM-DD-<description>.md` (PDFs converted to markdown). External URLs change; the archive is the authoritative source. Host on GitHub (public repo = public archive), not the production site (avoids serving large documents to voters).
- **Data model:** Each grounding entry is `{ text: string, aspect: string, sourceUrl: string, archivePath: string, dateRetrieved: string }`. A party+topic can have multiple entries (multiple aspects). Add optional `contrary?: string` (a position the party explicitly opposes) and `absent?: boolean` (no known position on this topic).
- For parties without a platform: confirm and document; show explicit disclosure in results ("המפלגה לא פרסמה מצע רשמי")
- Output: `lib/groundings.ts` (or a separate JSON data directory) mapping party + topic → grounding entries

#### 0.3 Grounding integration into results UX
Design and build the "grounding" display on the results page.
- **Format:** Expandable quote block below each party card, labeled "מה כתוב במצע". Multiple quotes shown per party (one per relevant aspect). Visually distinct from AI-generated blurbs.
- **Contrary/absent indicators:** If the data includes `contrary`, show "עמדה הפוכה: ...". If `absent: true`, show "לא נמצאה התייחסות לנושא זה במצע".
- Attribution per quote: source URL (linked) + date retrieved. Archive path available for audit but not shown to users.
- Net-new UI work on `components/UnifiedResultsPage.tsx`
- If a party has no platform on a given topic: show methodology disclaimer, not silence

#### 0.4 Security hardening
A civic tool handling political input must address abuse vectors before going public.
- **Rate limiting at edge:** Per-IP session cap (2–3 sessions/IP/day) implemented in Next.js middleware before public launch. Protects Gemini quota and prevents scraping.
- **Prompt injection prevention:** The close-step free-text field (`app/prototype-e/page.tsx`) is the primary injection vector. Sanitize input before passing to any AI call; strip HTML and limit length (200 chars). Consider passing it as data context, not as a user instruction.
- **AI output guardrails:** System prompts must instruct the model to (a) stay on-topic (voting guidance only, based on provided data), (b) not express political opinions beyond what the grounded data supports, (c) refuse to make voting recommendations, (d) decline to comment on candidates personally. Test with adversarial inputs before launch.
- **No PII logging:** Confirm no user answers or party match results are written to logs or any persistent store. Only aggregate events are tracked (see analytics item in Phase 1).
- **Input length limits:** All API routes must enforce server-side length limits on incoming JSON fields.

#### 0.5 Gemini quota hardening
The Round 1 quota exhaustion bug was fixed in code but was never tested under real concurrent load.
- Test: fire concurrent sessions against the production URL to confirm (a) quota error produces a Hebrew user-friendly message, (b) deterministic results still render without AI layer
- Test the per-session turn cap in Prototype D (8-turn limit)
- Per-IP rate limiting covered in 0.4 (Security)

#### 0.6 Content neutrality audit
All 16 question sets, option texts, hint definitions, and prologue/transition prompts reviewed for framing bias. Israeli political context makes this harder than average — security, religion/state, and judicial independence framing all carry implicit slant risk.
- Reviewer: advisor or independent political scientist
- Run this audit before score validation, so question rewrites can be incorporated into the score review

#### 0.7 Scoring correctness tests
The deterministic score matrix is the trust anchor of the tool — a bug here could silently give users wrong party matches.
- Write unit tests for the scoring logic: given a known answer vector + importance weights, assert the expected ranked output
- Test edge cases: all-zero weights, ties, maximum divergence
- Add regression tests whenever question set scores are updated
- These tests should run in CI and block deployment if they fail

#### 0.8 Infrastructure hardening
- Custom domain registered (.co.il or .org.il) — see Section 5 for domain discussion
- Vercel production env vars confirmed (GEMINI_API_KEY, Langfuse keys)
- Basic error monitoring active
- Langfuse tracing capturing all AI calls for production observability

---

### Phase 1: MVP Launch (Weeks 7–12)

**Entry condition:** All Phase 0 items complete; advisor sign-off on content.
**Exit condition:** Tool is live at a public URL, accessible to anyone; reaching real voters.

#### 1.1 Landing page and branding for production
- Remove "אב-טיפוס" label; update language to production-quality tool
- Add "about this tool" and "methodology" links
- Keep the tone/depth selector UX (ענייני/אישי, ממוקד/מעמיק) — it tested well
- Custom domain integrated

#### 1.2 Platform data display in results
- Implement the grounding layer designed in Phase 0 (item 0.3)
- Wire real platform quotes from the data file into the results page
- AI blurbs must reference the actual quote context (update prompt to receive quote data, not just scores)
- Update methodology disclaimer from "הערכה ידנית" to reflect real citation sourcing

#### 1.3 Update results API to use grounded data
`app/api/results/route.ts` currently receives only answers summary and top party scores. For MVP: the API prompt must also receive the relevant platform quotes per party, so AI explanations are grounded in real text, not hallucinated. Remove system prompt disclaimer about manual estimates.

#### 1.4 Site UI polish
- Remove prototype visual markers (color labels, experiment badges)
- Consistent typography and spacing throughout (landing, question flow, results)
- Mobile: verify full flow on small screens; buttons, tables, expandable sections
- Accessibility: keyboard navigation, color contrast, RTL correctness
- Scope is **polish, not redesign** — the interaction patterns tested well and are not changing
- Landing page gets the most attention: first impression determines trust

#### 1.5 Repository publication + open source checklist
- License decision: recommend MIT or a civic-tech-aligned license (e.g. EUPL); add `LICENSE` file
- Secrets audit: scan git history for any committed keys or personal data before making public
- Code cleanup: remove any TODO comments or debug artifacts that would embarrass in public
- Add `README.md` with: what the tool is, how it works, methodology, how to contribute, how to run locally
- Add `CONTRIBUTING.md` with guidelines for question set contributions (especially important for political neutrality)
- Go public simultaneously with the live tool launch

#### 1.6 Aggregate analytics (privacy-first)
Track aggregate behavior without any user-identifying data or answer content.
- **Events to track:** landing page visit, tone chosen (ענייני/אישי), depth chosen (ממוקד/מעמיק), flow step reached (priorities / topic N / close / results), session completed, session abandoned
- **Do NOT track:** which answers users selected, which parties they matched, anything that could identify a voter's political preferences
- **Party distribution:** show aggregate "N% of users matched ביחד as top party" on results page or a public dashboard — builds trust, not a privacy risk if truly aggregate
- Implementation: Vercel Analytics for page views (already in place); custom events via a lightweight event POST endpoint (no PII, no persistent user sessions)
- Langfuse for AI quality monitoring (already in place)
- Consider: if aggregate data is shown publicly, decide cadence (live? weekly?) and minimum threshold (don't show distribution until N ≥ 100 to avoid small-sample inference)

#### 1.7 User feedback mechanism
A simple mechanism for users to send observations to the builder and advisor.
- **MVP approach:** "שלח לנו הערה" button at the bottom of the results page → prefilled Google Form (no backend required)
- Form captures: path taken (E or D), free-text comment, optional contact email
- Keep form anonymous-first (email is optional)
- Privacy: feedback may contain politically sensitive content; treat as confidential; do not share or publish individual responses
- Migration to a proper feedback store (with moderation) in v1 if volume warrants it

#### 1.8 Soft launch + monitoring (Week 10)
- Share with 5–10 trusted users outside the builder's immediate circle
- Monitor Langfuse for AI call patterns, error rates, and unexpected outputs
- Monitor Gemini quota consumption to project costs at scale
- Check that security items (rate limiting, guardrails) hold under light real traffic

#### 1.9 Public launch (Week 12)
- Share publicly; coordinate with an election-relevant news cycle if possible
- Light personal brand attribution (builder's name; subtle; does not compromise tool's perceived neutrality)

---

### Phase 2: v1 — After MVP Validates (Months 4–5)

**Entry condition:** MVP has reached 1,000+ completions; no critical trust or accuracy bugs; at least one round of expert feedback on results quality.
**Exit condition:** All items below shipped; tool is qualitatively richer.

#### 2.1 Russian and Arabic UI layers
- Highest-priority language additions given Israeli voter demographics (~20% Arabic-speaking, ~15–20% Russian-speaking)
- Party platforms remain in Hebrew; AI answers and explanations translated per UI language
- Questions and option texts require cultural review — mechanical translation is insufficient
- English follows

#### 2.2 Semi-automatic platform data ingestion
- Replace the manual data file with a pipeline: scrape party platform pages on a schedule → present new/changed content to advisor for review/approval → merge into live data
- Especially important for parties that release platforms late in the campaign cycle
- Explicit versioning: each quote carries retrieval date; platform updates are archived, not overwritten

#### 2.3 Admin/curation interface (lightweight)
A minimal web UI or scripted workflow for the advisor to review platform quotes, approve scores, and update party data without touching code. Needs to be trustworthy (audit trail), not beautiful.

#### 2.4 Tradeoff question type
Concrete policy tradeoffs have higher discriminant validity than value statements. Requires validated question-answer sets with party positions — cannot be built before Phase 0 expert review is complete. Integrate as an optional "deeper dive" section after the main E flow.

#### 2.5 AI-scored follow-up answers
Follow-up Q&A currently feeds only the AI explanation layer, not the deterministic score. v1 would experiment with mapping follow-up answers back into the score matrix. Requires careful calibration to avoid eroding the deterministic trust anchor.

#### 2.6 Shareable results
Users generate a results link or image card to share. Must preserve privacy (no PII in share URL). Aggregate anonymized data shown optionally ("37% of users matched ביחד as their top party").

#### 2.7 Coalition modeling (research spike)
No VAA anywhere in the world models the Israeli coalition question. For many Israeli voters, "which party vote best enables my preferred coalition" is the real decision. v1 would include a design spike; full implementation is Phase 3+.

---

### Phase 3: Extensions (Month 6+, Post-Election)

**Entry condition:** v1 stable and maintained; elections have passed or are imminent.

These are independent tracks, not a single sequential phase.

#### 3.1 Candidate records
Individual Knesset member profiles: experience, notable votes, committee roles. Official sources only. Significant ongoing curation commitment.

#### 3.2 Coalition scenario modeling
Based on the Phase 2 spike. For each voter's values profile: show realistic coalition scenarios that best serve those values, and which parties' electoral strength enables each scenario.

#### 3.3 Multi-country generalization
The current architecture (Next.js, structured question sets, deterministic scoring, AI explanation) is generalizable. Design the country-switching layer only after at least one non-Israeli partner is ready to co-own content curation.

#### 3.4 Open-source community
If the tool proves its credibility, open-sourcing enables civic organizations to deploy their own instances. Requires: clean code, documentation, CI/CD others can run, and a licensing decision.

#### 3.5 Post-election retrospective
"How did the parties perform on their stated platform commitments?" A fundamentally different product — different data model, different cadence. Design once election results are known.

---

### Ongoing: Content Improvement Pipeline

This is not a phase — it runs throughout the product lifetime.

**Question set improvements (fixed questions):**
- The advisor review export (`npm run export:questions`) is the tool for periodic reviews
- When a party updates its platform or takes a new position, regenerate the review doc and schedule a targeted re-review of affected topics
- Each update to `lib/questions.ts` carries a review date and reviewer annotation
- Larger changes (adding a topic, rewriting a question) require a full neutrality review before deployment
- Keep AI follow-up prompts tracked in Langfuse — flag sessions where follow-ups felt off-topic or biased; review system prompt periodically

**Platform data maintenance:**
- Party platforms may update mid-campaign; each update requires re-ingestion and archive versioning
- The `docs/sources/<partyId>/` archive directory is the source of truth; `lib/groundings.ts` is derived from it
- Platform changes should trigger a targeted re-review of affected question scores

**A/B testing for question versions (v1+):**
- Defer formal A/B testing until v1. For MVP, all users see the same questions.
- When two question formulations are candidates, test via soft launch (share version A with one group, B with another) rather than building in-app A/B infrastructure.

---

## 4. Key Decisions Table

| Decision | Status | Notes |
|---|---|---|
| Hybrid model (quiz engine + AI explanation layer) | ✅ Decided | Documented in REQUIREMENTS.md. Not revisited. |
| Freeform chatbot explicitly ruled out | ✅ Decided | Upheld through all 3 testing rounds. |
| Prototype E as MVP interaction model | ✅ Decided | Validated in Round 3. |
| Hebrew-first | ✅ Decided | Russian and Arabic in v1. |
| All 7 parties covered | ✅ Decided | Parties without published platforms shown with explicit disclosure. |
| Free tool, no monetization | ✅ Decided | |
| $50/month cost cap | ✅ Decided | Gemini free tier (RPD=500 on gemini-3.1-flash-lite). Fallback needed — see risks. |
| Official party platforms only (no social media) | ✅ Decided | |
| Repository goes public after MVP | ✅ Decided | Recommend: simultaneously with live launch. |
| Scoring matrix is deterministic; AI is explanation only | ✅ Decided | Core architectural invariant. AI never overrides scores. |
| Verbatim quotations as primary trust evidence | ✅ Decided | MVP requirement; implementation is Phase 0. |
| Prototype D in MVP or deferred | ✅ Decided | Keep all prototypes (routes stay live, links hidden from landing). No further development investment in D for MVP. |
| Which parties get citations in MVP | ✅ Decided | All 7 if platforms available; never hold launch waiting for a single party. |
| Grounding data model | ✅ Decided | Array of `{ text, aspect, sourceUrl, archivePath, dateRetrieved }` per party+topic. Optional `contrary` and `absent` fields. Multiple quotes per party per topic. |
| Grounding UX | ✅ Decided | Expandable quote block below each party card, labeled "מה כתוב במצע". Multiple quotes per aspect. Contrary/absent shown explicitly. |
| Source document archiving | ✅ Decided | `docs/sources/<partyId>/YYYY-MM-DD-<description>.md` in the public GitHub repo. Not served from the production site. |
| Security: MVP requirements | ✅ Decided | Rate limiting at edge, prompt injection prevention on free-text field, AI output guardrails, no PII logging, input length limits. All Phase 0. |
| Analytics approach | ✅ Decided | Aggregate-only (events: tone, depth, step reached, completion/abandonment). No answer content, no party match data per user. Show aggregate party distribution on results page. |
| User feedback mechanism | ✅ Decided | Google Form at bottom of results page for MVP; migrate to proper store in v1 if volume warrants. |
| Open source: timing + checklist | ✅ Decided | Simultaneously with MVP launch. Requires: license, secrets audit, code cleanup, README, CONTRIBUTING.md. |
| Cost fallback if Gemini free tier exhausted | **Deferred** | Discuss closer to MVP launch. Per-IP rate limiting is the primary mitigation in Phase 0. |
| Custom domain name | **Open** | Brainstorm: `bechira.co.il`, `matzpen.co.il`, `kol-ishi.co.il`. Domain must convey: civic, trustworthy, voter-oriented. Decision before Phase 0.8. |
| Site UI: redesign vs. polish | **Open** | Scope is polish (not redesign). Needs discussion on exactly what feels prototype-y and must change for MVP. |
| Data storage format for groundings | **Open** | TypeScript constant (`lib/groundings.ts`) vs. separate JSON files per party. Either works for MVP; JSON files are easier for the advisor to inspect and diff. Decide in Phase 0.2. |

---

## 5. Risk Register

### Risk 1: Party platforms not published before launch
**Likelihood:** High. ביחד and ישר! have no formal platform as of June 2026. Platforms may appear late in the campaign.
**Impact:** Without verbatim citations, the core trust differentiator is absent. The current "manual estimates" disclaimer is acceptable for a prototype, not for a production civic tool.
**Mitigation:**
- Set a launch date that is platform-availability-conditional, not calendar-conditional
- Show explicit per-party disclosure ("מפלגה זו לא פרסמה מצע רשמי — הניקוד מבוסס על עמדות ציבוריות ידועות")
- Monitor party websites weekly during Phase 0; ingest as soon as platforms appear
- Never hold the entire launch waiting for any single party's platform

### Risk 2: Gemini free-tier exhaustion at scale
**Likelihood:** Medium-to-high. Prototype hit quota limits with only 2 users in a single day (Round 1). At RPD=500, a public launch with press coverage could exhaust the daily quota within hours. Each full session uses ≤9 API calls; that is ~55 concurrent full sessions per day before quota.
**Impact:** AI follow-ups and result explanations go dark. Deterministic scores still render — but experience degrades noticeably.
**Mitigation:**
- Graceful degradation is already implemented
- Per-IP rate limiting (2–3 sessions/IP/day) at the Vercel edge before public launch
- Budget $10–15/month for Gemini paid tier failover; activate proactively based on first-week traffic

### Risk 3: Domain expert unavailability blocks Phase 0
**Likelihood:** Medium. Score review and neutrality audit are blocked on a single advisor.
**Impact:** Launch timeline slips; or tool ships with unvalidated scores.
**Mitigation:**
- Identify advisor and negotiate a specific time commitment (4–6 hours over 2 weeks) before starting Phase 0
- Prepare structured review packet (spreadsheet) so review can happen asynchronously
- Identify a backup reviewer if primary advisor is unavailable
- Do not launch without at least the score review completed

### Risk 4: Political controversy or bad-faith use
**Likelihood:** Low-medium. Any Israeli civic tool risks accusations of political bias.
**Impact:** Reputational risk to builder; potential pressure to take down.
**Mitigation:**
- Methodology transparency is the primary defense: publicly document how scores are derived, who reviewed them, and what the data sources are
- The repo going public is itself a mitigation — anyone can audit the scoring matrix
- No editorial framing: "you matched X" is value-neutral; "you should vote X" is never shown
- Prepare a brief FAQ addressing predictable objections ("why is party X scored higher than Y on topic Z")

### Risk 5: Question neutrality is harder than it looks
**Likelihood:** High. The neutrality audit (Phase 0, item 0.5) may reveal embedded framing bias in several question sets, especially on judicial independence, security, and religion/state. Fixing this could require rewriting multiple question sets and recalibrating scores.
**Impact:** Scope creep in Phase 0; delayed launch.
**Mitigation:**
- Run the neutrality audit before score validation, so question rewrites feed into the score review
- Wahl-O-Mat principle: for each question, both "agree" and "disagree" must be plausible, defensible positions held by reasonable people
- Reserve 2 weeks of buffer in Phase 0 specifically for question revision after the audit

---

## 6. Remaining Open Questions

Most decisions are now resolved (see Section 4). Three remain open:

**Domain name:** What should the tool be called? The domain name is the tool's public identity. Options: `bechira.co.il` (בחירה — neutral, direct), `matzpen.co.il` (מצפן — the international VAA metaphor; well-understood, may feel generic), `kol-ishi.co.il` (קול אישי — personal vote; warm, but may undersell the civic angle). A Hebrew-language name that is pronounceable without knowing Hebrew would also help with Russian/Arabic speakers. Decision needed before Phase 0.8.

**Site UI scope:** What specifically looks prototype-y and must change? Suggested discussion: walk through the live tool and note each element that breaks trust. Decision shapes 1.4 scope estimate.

**Groundings data format:** TypeScript constant (`lib/groundings.ts`) vs. per-party JSON files (`data/groundings/<partyId>.json`). JSON files are easier for the advisor to inspect, diff, and contribute without touching source code. TypeScript gives compile-time type checking. Hybrid: JSON as source, a build step that generates a typed TypeScript import. Decision needed before Phase 0.2 implementation.

---

## Summary Timeline (6-Month View)

| Month | Milestone |
|---|---|
| Month 1 | Phase 0 begins: advisor engaged; neutrality audit and score review underway |
| Month 2 | Party platform data collected; grounding UX designed; infrastructure hardened |
| Month 3 | MVP coded: grounding layer, updated results API, production domain, public repo ready |
| Month 3 end | Soft launch: 5–10 users outside builder's circle; Langfuse monitoring active |
| Month 4 | Public launch; press/social outreach; monitor quota and accuracy |
| Month 4–5 | Iterate on MVP feedback; begin Russian and Arabic translations |
| Month 5 | v1 features: multilingual, ingestion pipeline, shareable results |
| Month 6 (elections) | Tool is live, maintained, and credible for election day traffic |
| Post-election | Phase 3 evaluation; retrospective; open-source decision |
